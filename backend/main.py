from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid
from typing import List, Optional
from datetime import datetime
import time
import google.generativeai as genai

import fitz  # PyMuPDF
from pymongo import ReturnDocument
from enhanced_parser import parse_quiz_text, parse_quiz_text_advanced, validate_questions
from timer_backend import (
    init_timer_handler, sync_time_handler, validate_time_handler,
    submit_quiz_handler, get_submission_handler, get_quiz_submissions_handler,
    get_active_timer_handler, cleanup_expired_sessions_handler,
    InitTimerRequest, SyncTimeRequest, ValidateTimeRequest, SubmitQuizRequest
)

# MongoDB is required for all persistence
from dotenv import load_dotenv
# Load root .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
# Also load local .env (useful for backend-specific keys like GEMINI_API_KEY)
load_dotenv()

MONGO_URI = os.getenv("DB")
mongo_collection = None
saved_quizzes_collection = None
drafts_collection = None
counters_collection = None

if MONGO_URI:
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient(MONGO_URI)
        mongo_db = mongo_client["quizauto"]
        mongo_collection = mongo_db["quizzes"]
        saved_quizzes_collection = mongo_db["saved_quizzes"]
        drafts_collection = mongo_db["drafts"]
        counters_collection = mongo_db["counters"]
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️ MongoDB not connected: {e}")

if mongo_collection is None:
    raise RuntimeError("MongoDB is required. Set DB in .env")

app = FastAPI(title="Quiz Generator API", version="2.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# ============ Pydantic Models ============

class QuizRequest(BaseModel):
    text: str
    num_questions: Optional[int] = 5
    advanced_parsing: Optional[bool] = False

class DraftRequest(BaseModel):
    id: Optional[int] = None
    raw_text: Optional[str] = None
    parsed_data: Optional[list] = None

class SaveQuizRequest(BaseModel):
    name: str
    questions: List[dict]


def _next_id(counter_name: str) -> int:
    if counters_collection is None:
        raise HTTPException(status_code=500, detail="MongoDB counters collection unavailable")
    doc = counters_collection.find_one_and_update(
        {"_id": counter_name},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["value"])

# ============ Root Endpoint ============

@app.get("/")
async def root():
    return {
        "message": "Quiz Generator API is running",
        "version": "2.0",
        "features": [
            "PDF upload and text extraction",
            "Quiz generation from text",
            "Draft saving and loading",
            "Timer sessions with backend sync",
            "Quiz submission and result storage"
        ]
    }

# ============ PDF Upload and Extraction ============

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Use unique filename to avoid collisions (from Version 2)
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        if not text.strip():
            text = "[Empty PDF content. OCR not implemented yet. Please ensure PDF contains selectable text.]"
            
        return {"filename": file.filename, "content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/api/upload-gemini")
async def upload_pdf_gemini(file: UploadFile = File(...)):
    allowed_extensions = (".pdf", ".docx")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are allowed for Gemini")
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Load API key securely from environment variable instead of hardcoding it
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY is not configured in the server environment (.env).")
            
        genai.configure(api_key=api_key)
        
        mime_type = "application/pdf"
        if file.filename.lower().endswith(".docx"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
        uploaded_file = genai.upload_file(path=file_path, mime_type=mime_type)
        
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            raise Exception("Gemini file processing failed.")
            
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        
        response = model.generate_content([
            uploaded_file,
            "Please scan this file and provide the full text content found within it. "
            "If there are images with text, transcribe them as well. Format the raw text accurately."
        ])
        
        # Cleanup file from google AI Studio
        try:
            genai.delete_file(uploaded_file.name)
        except Exception:
            pass
            
        return {"filename": file.filename, "content": response.text}
    except Exception as e:
        print(f"❌ Gemini Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing with Gemini: {str(e)}")

# ============ Quiz Generation and Parsing ============

@app.post("/api/generate-quiz")
async def generate_quiz(request: QuizRequest):
    try:
        if request.advanced_parsing:
            parsed_questions = parse_quiz_text_advanced(request.text)
        else:
            parsed_questions = parse_quiz_text(request.text)
        
        parsed_questions = validate_questions(parsed_questions)
        
        if request.num_questions and len(parsed_questions) > request.num_questions:
            parsed_questions = parsed_questions[:request.num_questions]
        
        # Store in MongoDB if available (from Version 2)
        if parsed_questions and mongo_collection is not None:
            mongo_collection.insert_one({
                "raw_text": request.text, 
                "questions": parsed_questions,
                "created_at": datetime.utcnow()
            })
        
        return {
            "questions": parsed_questions,
            "count": len(parsed_questions),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-quiz")
async def parse_quiz(request: QuizRequest):
    try:
        if request.advanced_parsing:
            parsed_questions = parse_quiz_text_advanced(request.text)
        else:
            parsed_questions = parse_quiz_text(request.text)
        
        parsed_questions = validate_questions(parsed_questions)
        
        # Store in MongoDB if available (from Version 2)
        if parsed_questions and mongo_collection is not None:
            mongo_collection.insert_one({
                "raw_text": request.text, 
                "questions": parsed_questions,
                "created_at": datetime.utcnow()
            })
        
        return {
            "questions": parsed_questions,
            "count": len(parsed_questions),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ Quiz Management (from Version 1) ============

@app.post("/api/save-quiz")
async def save_quiz(request: SaveQuizRequest):
    try:
        quiz_id = _next_id("saved_quizzes")
        saved_quizzes_collection.insert_one(
            {
                "quiz_id": quiz_id,
                "name": request.name,
                "questions": request.questions,
                "created_at": datetime.utcnow(),
            }
        )
        
        return {
            "status": "success",
            "quiz_id": quiz_id,
            "name": request.name,
            "question_count": len(request.questions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save quiz: {str(e)}")

@app.get("/api/quizzes")
async def get_quizzes():
    quizzes = list(saved_quizzes_collection.find({}).sort("created_at", -1))
    return [
        {
            "id": q.get("quiz_id"),
            "name": q.get("name", ""),
            "created_at": q.get("created_at").isoformat() if q.get("created_at") else None,
            "question_count": len(q.get("questions", [])),
        }
        for q in quizzes
    ]

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: int):
    quiz = saved_quizzes_collection.find_one({"quiz_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return {
        "id": quiz.get("quiz_id"),
        "name": quiz.get("name", ""),
        "created_at": quiz.get("created_at").isoformat() if quiz.get("created_at") else None,
        "questions": [
            {
                "id": idx + 1,
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "answer": q.get("answer", q.get("correct_answer", "")),
            }
            for idx, q in enumerate(quiz.get("questions", []))
        ]
    }

@app.get("/api/debug")
async def debug():
    """Debug endpoint to check MongoDB status (from Version 2)"""
    if mongo_collection is None:
        return {"status": "MongoDB not connected"}
    
    quizzes = list(mongo_collection.find({}, {"raw_text": 0}))
    return {
        "status": "MongoDB connected",
        "count": len(quizzes),
        "quizzes": [{ "id": str(q["_id"]), "question_count": len(q.get("questions", [])) } for q in quizzes]
    }

# ============ Draft Endpoints ============

@app.post("/api/drafts")
async def save_draft(draft: DraftRequest):
    if draft.id:
        update_result = drafts_collection.update_one(
            {"draft_id": draft.id},
            {
                "$set": {
                    "raw_text": draft.raw_text,
                    "parsed_data": draft.parsed_data,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        if update_result.matched_count == 0:
            # Fallback: if ID was provided but not found, create it instead of failing
            drafts_collection.insert_one({
                "draft_id": draft.id,
                "raw_text": draft.raw_text,
                "parsed_data": draft.parsed_data,
                "updated_at": datetime.utcnow(),
            })
        draft_id = draft.id
    else:
        draft_id = _next_id("drafts")
        drafts_collection.insert_one(
            {
                "draft_id": draft_id,
                "raw_text": draft.raw_text,
                "parsed_data": draft.parsed_data,
                "updated_at": datetime.utcnow(),
            }
        )
    
    return {"id": draft_id, "message": "Draft saved successfully"}

@app.get("/api/drafts/all")
async def get_all_drafts():
    drafts = list(drafts_collection.find({}).sort("updated_at", -1))
    return [
        {
            "id": d.get("draft_id"),
            "question_count": len(d.get("parsed_data", [])),
            "updated_at": d.get("updated_at").isoformat() if d.get("updated_at") else None
        }
        for d in drafts
    ]

@app.get("/api/drafts/latest")
async def get_latest_draft():
    draft = drafts_collection.find_one({}, sort=[("updated_at", -1)])
    if not draft:
        return {"id": None, "raw_text": "", "parsed_data": []}
    return {
        "id": draft.get("draft_id"),
        "raw_text": draft.get("raw_text", ""),
        "parsed_data": draft.get("parsed_data", []),
    }

@app.get("/api/drafts/{draft_id}")
async def get_draft(draft_id: int):
    draft = drafts_collection.find_one({"draft_id": draft_id})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {
        "id": draft.get("draft_id"),
        "raw_text": draft.get("raw_text", ""),
        "parsed_data": draft.get("parsed_data", []),
    }

@app.delete("/api/drafts/{draft_id}")
async def delete_draft(draft_id: int):
    delete_result = drafts_collection.delete_one({"draft_id": draft_id})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Draft deleted successfully"}

# ============ Timer and Submission Endpoints ============

@app.post("/api/quiz/init-timer")
async def init_timer(request: InitTimerRequest):
    return await init_timer_handler(request)

@app.post("/api/quiz/sync-time")
async def sync_time(request: SyncTimeRequest):
    return await sync_time_handler(request)

@app.post("/api/quiz/validate-time")
async def validate_time(request: ValidateTimeRequest):
    return await validate_time_handler(request)

@app.post("/api/quiz/submit")
async def submit_quiz(request: SubmitQuizRequest, http_request: Request = None):
    return await submit_quiz_handler(request, http_request)

@app.get("/api/quiz/submission/{submission_id}")
async def get_submission(submission_id: int):
    return await get_submission_handler(submission_id)

@app.get("/api/quiz/submissions/{quiz_id}")
async def get_quiz_submissions(quiz_id: str):
    return await get_quiz_submissions_handler(quiz_id)

@app.get("/api/quiz/active-timer/{quiz_id}")
async def get_active_timer(quiz_id: str):
    return await get_active_timer_handler(quiz_id)

@app.post("/api/quiz/cleanup-sessions")
async def cleanup_expired_sessions():
    return await cleanup_expired_sessions_handler()

# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    try:
        mongo_client.admin.command("ping")
        mongo_status = "healthy"
    except Exception as e:
        mongo_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "database": "mongodb",
        "mongodb": mongo_status,
        "timestamp": datetime.utcnow().isoformat(),
    }

# ============ Run the App ============

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Quiz Generator API Server...")
    print(f"📁 Upload directory: {UPLOAD_DIR}")
    print(f"🗄️  Database: MongoDB only")
    if mongo_collection is not None:
        print(f"🍃 MongoDB: Connected for all persistence")
    else:
        print(f"🍃 MongoDB: Not configured (set DB in .env)")
    print(f"⏲️  Timer features enabled")
    print(f"🌐 Server running at: http://0.0.0.0:8088")
    print(f"📚 API Docs: http://0.0.0.0:8088/docs")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8088,
        log_level="info"
    )