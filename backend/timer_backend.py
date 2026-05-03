from fastapi import HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ReturnDocument

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
MONGO_URI = os.getenv("DB")

if not MONGO_URI:
    raise RuntimeError("MongoDB URI is required. Set DB in .env")

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client["quizauto"]
timer_sessions_collection = mongo_db["timer_sessions"]
quiz_submissions_collection = mongo_db["quiz_submissions"]
counters_collection = mongo_db["counters"]
saved_quizzes_collection = mongo_db["saved_quizzes"]


class InitTimerRequest(BaseModel):
    quiz_id: str
    time_limit: int
    started_at: int


class SyncTimeRequest(BaseModel):
    quiz_id: str
    elapsed_time: int
    remaining_time: int
    timestamp: int


class ValidateTimeRequest(BaseModel):
    quiz_id: str
    client_remaining: int
    client_elapsed: int
    timestamp: int


class SubmitQuizRequest(BaseModel):
    quiz_id: str
    quiz_name: Optional[str] = None
    answers: Dict[str, Any]
    results: Optional[list] = None
    score: Optional[int] = None
    total_questions: Optional[int] = None
    percentage: Optional[float] = None
    time_taken: Optional[int] = 0
    time_limit: Optional[int] = 0
    is_auto_submit: Optional[bool] = False
    submitted_at: str
    time_remaining: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None


def _resolve_quiz(quiz_id: str) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    # quiz_id can be numeric string for saved quiz or arbitrary draft id
    quiz_doc = None
    questions: List[Dict[str, Any]] = []
    try:
        quiz_doc = saved_quizzes_collection.find_one({"quiz_id": int(quiz_id)})
    except Exception:
        quiz_doc = saved_quizzes_collection.find_one({"quiz_id": quiz_id})
    if quiz_doc:
        questions = quiz_doc.get("questions", []) or []
    return quiz_doc, questions


def _normalize_answer(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _extract_correct_answer(question: Dict[str, Any]) -> str:
    answer = question.get("answer", question.get("correct_answer", ""))
    if isinstance(answer, str) and len(answer.strip()) == 1 and answer.strip().upper() in ["A", "B", "C", "D", "E", "F", "G"]:
        options = question.get("options", []) or []
        idx = ord(answer.strip().upper()) - 65
        if 0 <= idx < len(options):
            return str(options[idx])
    return str(answer)


def _grade_submission(questions: List[Dict[str, Any]], answers: Dict[str, Any]) -> Tuple[int, List[Dict[str, Any]]]:
    score = 0
    results = []
    for idx, question in enumerate(questions):
        user_answer = answers.get(str(idx))
        if user_answer is None:
            user_answer = answers.get(idx)

        correct_answer_text = _extract_correct_answer(question)
        is_correct = _normalize_answer(user_answer) == _normalize_answer(correct_answer_text) if user_answer is not None else False
        if is_correct:
            score += 1
        results.append(
            {
                "questionId": question.get("id", idx),
                "question": question.get("question", ""),
                "userAnswer": user_answer if user_answer else "Not answered",
                "correctAnswer": correct_answer_text,
                "isCorrect": is_correct,
            }
        )
    return score, results


def _next_id(counter_name: str) -> int:
    doc = counters_collection.find_one_and_update(
        {"_id": counter_name},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["value"])


def _calculate_remaining_time(session: Dict[str, Any]) -> int:
    elapsed = int((datetime.utcnow() - session["started_at"]).total_seconds())
    remaining = max(0, int(session["time_limit"]) - elapsed)
    return remaining


def _get_active_session(quiz_id: str) -> Optional[Dict[str, Any]]:
    return timer_sessions_collection.find_one({"quiz_id": quiz_id, "is_active": True})


async def init_timer_handler(request: InitTimerRequest):
    try:
        started_at = datetime.fromtimestamp(request.started_at / 1000)

        existing = _get_active_session(request.quiz_id)
        if existing:
            remaining = _calculate_remaining_time(existing)
            return {
                "status": "existing",
                "quiz_id": request.quiz_id,
                "started_at": existing["started_at"].timestamp() * 1000,
                "remaining_time": remaining,
                "time_limit": int(existing["time_limit"]),
            }

        now = datetime.utcnow()
        timer_sessions_collection.insert_one(
            {
                "quiz_id": request.quiz_id,
                "started_at": started_at,
                "time_limit": request.time_limit,
                "remaining_time": request.time_limit,
                "last_sync_at": now,
                "is_active": True,
                "created_at": now,
            }
        )

        return {
            "status": "initialized",
            "quiz_id": request.quiz_id,
            "started_at": started_at.timestamp() * 1000,
            "remaining_time": request.time_limit,
            "time_limit": request.time_limit,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize timer: {str(e)}")


async def sync_time_handler(request: SyncTimeRequest):
    try:
        session = _get_active_session(request.quiz_id)
        if not session:
            raise HTTPException(status_code=404, detail="Timer session not found")

        timer_sessions_collection.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "remaining_time": request.remaining_time,
                    "last_sync_at": datetime.utcnow(),
                }
            },
        )

        session["remaining_time"] = request.remaining_time
        server_remaining = _calculate_remaining_time(session)

        return {
            "status": "synced",
            "quiz_id": request.quiz_id,
            "server_remaining": server_remaining,
            "client_remaining": request.remaining_time,
            "drift": server_remaining - request.remaining_time,
            "timestamp": request.timestamp,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync time: {str(e)}")


async def validate_time_handler(request: ValidateTimeRequest):
    try:
        session = _get_active_session(request.quiz_id)

        response = {
            "is_valid": True,
            "server_remaining": request.client_remaining,
            "server_elapsed": request.client_elapsed,
        }

        if session:
            server_remaining = _calculate_remaining_time(session)
            drift = server_remaining - request.client_remaining

            if abs(drift) > 3:
                response["is_valid"] = False
                response["server_remaining"] = server_remaining
                response["drift"] = drift
                response["message"] = "Time drift detected, syncing with server"

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate time: {str(e)}")


async def submit_quiz_handler(request: SubmitQuizRequest, http_request: Request = None):
    try:
        client_ip = http_request.client.host if http_request and http_request.client else None

        submission_id = _next_id("quiz_submissions")
        parsed_submitted_at = datetime.fromisoformat(request.submitted_at.replace("Z", "+00:00"))
        quiz_doc, quiz_questions = _resolve_quiz(request.quiz_id)
        can_show_answers = bool(quiz_doc.get("allow_answer_review", False)) if quiz_doc else False
        quiz_name = request.quiz_name or (quiz_doc.get("name") if quiz_doc else "") or f"Quiz {request.quiz_id}"

        if quiz_questions:
            computed_score, computed_results = _grade_submission(quiz_questions, request.answers or {})
            total_questions = len(quiz_questions)
            percentage = (computed_score / total_questions * 100) if total_questions > 0 else 0
        else:
            computed_score = int(request.score or 0)
            computed_results = request.results or []
            total_questions = int(request.total_questions or 0)
            percentage = float(request.percentage or 0)

        quiz_submissions_collection.insert_one(
            {
                "submission_id": submission_id,
                "quiz_id": request.quiz_id,
                "quiz_name": quiz_name,
                "user_answers": request.answers,
                "results": computed_results,
                "score": computed_score,
                "total_questions": total_questions,
                "percentage": int(percentage),
                "time_taken": int(request.time_taken or 0),
                "time_limit": int(request.time_limit or 0),
                "is_auto_submit": bool(request.is_auto_submit),
                "submitted_at": parsed_submitted_at,
                "can_show_answers": can_show_answers,
                "extra_data": {
                    "time_remaining": request.time_remaining,
                    "client_ip": client_ip,
                    "request_extra_data": request.extra_data,
                },
            }
        )

        timer_sessions_collection.update_many(
            {"quiz_id": request.quiz_id, "is_active": True},
            {"$set": {"is_active": False, "last_sync_at": datetime.utcnow()}},
        )

        submissions_dir = Path("submissions")
        submissions_dir.mkdir(exist_ok=True)

        submission_file = submissions_dir / f"{request.quiz_id}_{submission_id}.json"
        with open(submission_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": submission_id,
                    "quiz_id": request.quiz_id,
                    "quiz_name": quiz_name,
                    "score": computed_score,
                    "total": total_questions,
                    "percentage": percentage,
                    "time_taken": int(request.time_taken or 0),
                    "is_auto_submit": request.is_auto_submit,
                    "submitted_at": request.submitted_at,
                },
                f,
                indent=2,
            )

        return {
            "status": "submitted",
            "submission_id": submission_id,
            "quiz_id": request.quiz_id,
            "quiz_name": quiz_name,
            "score": computed_score,
            "total": total_questions,
            "percentage": percentage,
            "can_show_answers": can_show_answers,
            "results": computed_results if can_show_answers else [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")


async def get_submission_handler(submission_id: int):
    submission = quiz_submissions_collection.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submitted_at = submission.get("submitted_at")
    submitted_at_value = submitted_at.isoformat() if isinstance(submitted_at, datetime) else str(submitted_at)

    can_show_answers = bool(submission.get("can_show_answers", False))
    return {
        "id": submission["submission_id"],
        "quiz_id": submission.get("quiz_id"),
        "quiz_name": submission.get("quiz_name"),
        "score": submission.get("score", 0),
        "total_questions": submission.get("total_questions", 0),
        "percentage": submission.get("percentage", 0),
        "time_taken": submission.get("time_taken", 0),
        "is_auto_submit": bool(submission.get("is_auto_submit", False)),
        "submitted_at": submitted_at_value,
        "can_show_answers": can_show_answers,
        "results": submission.get("results", []) if can_show_answers else [],
    }


async def get_quiz_submissions_handler(quiz_id: str):
    submissions = list(
        quiz_submissions_collection.find({"quiz_id": quiz_id}).sort("submitted_at", -1)
    )

    results = []
    percentages = []
    for submission in submissions:
        submitted_at = submission.get("submitted_at")
        submitted_at_value = submitted_at.isoformat() if isinstance(submitted_at, datetime) else str(submitted_at)
        percentage = float(submission.get("percentage", 0))
        percentages.append(percentage)
        results.append(
            {
                "id": submission.get("submission_id"),
                "quiz_id": submission.get("quiz_id"),
                "quiz_name": submission.get("quiz_name"),
                "score": submission.get("score", 0),
                "total_questions": submission.get("total_questions", 0),
                "percentage": percentage,
                "time_taken": submission.get("time_taken", 0),
                "is_auto_submit": bool(submission.get("is_auto_submit", False)),
                "submitted_at": submitted_at_value,
            }
        )
    avg_score = round(sum(percentages) / len(percentages), 2) if percentages else 0
    max_score = round(max(percentages), 2) if percentages else 0
    min_score = round(min(percentages), 2) if percentages else 0

    return {
        "quiz_id": quiz_id,
        "total_attempts": len(results),
        "statistics": {
            "average_percentage": avg_score,
            "max_percentage": max_score,
            "min_percentage": min_score,
        },
        "submissions": results,
    }


async def get_active_timer_handler(quiz_id: str):
    session = _get_active_session(quiz_id)
    if not session:
        return {"is_active": False, "quiz_id": quiz_id}

    remaining = _calculate_remaining_time(session)
    last_sync_at = session.get("last_sync_at")
    last_sync_ms = (
        last_sync_at.timestamp() * 1000 if isinstance(last_sync_at, datetime) else None
    )

    return {
        "is_active": True,
        "quiz_id": quiz_id,
        "started_at": session["started_at"].timestamp() * 1000,
        "time_limit": int(session["time_limit"]),
        "remaining_time": remaining,
        "last_sync_at": last_sync_ms,
    }


async def cleanup_expired_sessions_handler():
    cutoff = datetime.utcnow() - timedelta(hours=24)
    expired_cursor = timer_sessions_collection.find(
        {"created_at": {"$lt": cutoff}, "is_active": True}, {"quiz_id": 1}
    )
    expired_sessions = list(expired_cursor)
    count = len(expired_sessions)

    if count > 0:
        timer_sessions_collection.update_many(
            {"_id": {"$in": [s["_id"] for s in expired_sessions]}},
            {"$set": {"is_active": False, "last_sync_at": datetime.utcnow()}},
        )

    return {"cleaned_up": count, "message": f"Removed {count} expired sessions"}
