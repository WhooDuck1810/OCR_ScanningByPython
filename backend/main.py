from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import uuid
from typing import List, Optional
from datetime import datetime

import fitz  # PyMuPDF

from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import Draft, Quiz, Question
from enhanced_parser import parse_quiz_text, parse_quiz_text_advanced, validate_questions
from timer_backend import (
    init_timer_handler, sync_time_handler, validate_time_handler,
    submit_quiz_handler, get_submission_handler, get_quiz_submissions_handler,
    get_active_timer_handler, cleanup_expired_sessions_handler,
    InitTimerRequest, SyncTimeRequest, ValidateTimeRequest, SubmitQuizRequest
)

# Optional MongoDB - only if .env has DB configured
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

MONGO_URI = os.getenv("DB")
mongo_collection = None

if MONGO_URI:
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient(MONGO_URI)
        mongo_db = mongo_client["quizauto"]
        mongo_collection = mongo_db["quizzes"]
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️ MongoDB not connected: {e}")

# Create tables
Base.metadata.create_all(bind=engine)

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
        if parsed_questions and mongo_collection:
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
        if parsed_questions and mongo_collection:
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
async def save_quiz(request: SaveQuizRequest, db: Session = Depends(get_db)):
    try:
        quiz = Quiz(name=request.name)
        db.add(quiz)
        db.flush()
        
        for q in request.questions:
            question = Question(
                quiz_id=quiz.id,
                question_text=q.get("question", ""),
                choices_list=q.get("options", []),
                correct_answer=q.get("answer", q.get("correct_answer", ""))
            )
            db.add(question)
        
        db.commit()
        db.refresh(quiz)
        
        return {
            "status": "success",
            "quiz_id": quiz.id,
            "name": quiz.name,
            "question_count": len(request.questions)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save quiz: {str(e)}")

@app.get("/api/quizzes")
async def get_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    return [
        {
            "id": q.id,
            "name": q.name,
            "created_at": q.created_at.isoformat(),
            "question_count": len(q.questions)
        }
        for q in quizzes
    ]

@app.get("/api/quizzes/{quiz_id}")
async def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    return {
        "id": quiz.id,
        "name": quiz.name,
        "created_at": quiz.created_at.isoformat(),
        "questions": [
            {
                "id": q.id,
                "question": q.question_text,
                "options": q.choices_list,
                "answer": q.correct_answer
            }
            for q in quiz.questions
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
async def save_draft(draft: DraftRequest, db: Session = Depends(get_db)):
    if draft.id:
        db_draft = db.query(Draft).filter(Draft.id == draft.id).first()
        if not db_draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        db_draft.raw_text = draft.raw_text
        db_draft.parsed_data = draft.parsed_data
    else:
        db_draft = Draft(raw_text=draft.raw_text, parsed_data=draft.parsed_data)
        db.add(db_draft)
    
    db.commit()
    db.refresh(db_draft)
    return {"id": db_draft.id, "message": "Draft saved successfully"}

@app.get("/api/drafts/latest")
async def get_latest_draft(db: Session = Depends(get_db)):
    draft = db.query(Draft).order_by(Draft.updated_at.desc()).first()
    if not draft:
        return {"id": None, "raw_text": "", "parsed_data": []}
    return {"id": draft.id, "raw_text": draft.raw_text, "parsed_data": draft.parsed_data}

@app.get("/api/drafts/{draft_id}")
async def get_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"id": draft.id, "raw_text": draft.raw_text, "parsed_data": draft.parsed_data}

@app.delete("/api/drafts/{draft_id}")
async def delete_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    db.delete(draft)
    db.commit()
    return {"message": "Draft deleted successfully"}

# ============ Timer and Submission Endpoints ============

@app.post("/api/quiz/init-timer")
async def init_timer(request: InitTimerRequest, db: Session = Depends(get_db)):
    return await init_timer_handler(request, db)

@app.post("/api/quiz/sync-time")
async def sync_time(request: SyncTimeRequest, db: Session = Depends(get_db)):
    return await sync_time_handler(request, db)

@app.post("/api/quiz/validate-time")
async def validate_time(request: ValidateTimeRequest, db: Session = Depends(get_db)):
    return await validate_time_handler(request, db)

@app.post("/api/quiz/submit")
async def submit_quiz(request: SubmitQuizRequest, db: Session = Depends(get_db), http_request: Request = None):
    return await submit_quiz_handler(request, db, http_request)

@app.get("/api/quiz/submission/{submission_id}")
async def get_submission(submission_id: int, db: Session = Depends(get_db)):
    return await get_submission_handler(submission_id, db)

@app.get("/api/quiz/submissions/{quiz_id}")
async def get_quiz_submissions(quiz_id: str, db: Session = Depends(get_db)):
    return await get_quiz_submissions_handler(quiz_id, db)

@app.get("/api/quiz/active-timer/{quiz_id}")
async def get_active_timer(quiz_id: str, db: Session = Depends(get_db)):
    return await get_active_timer_handler(quiz_id, db)

@app.post("/api/quiz/cleanup-sessions")
async def cleanup_expired_sessions(db: Session = Depends(get_db)):
    return await cleanup_expired_sessions_handler(db)

# ============ Health Check ============

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "ok",
        "database": db_status,
        "mongodb": "connected" if mongo_collection else "not configured",
        "timestamp": datetime.utcnow().isoformat()
    }

# ============ Run the App ============

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Quiz Generator API Server...")
    print(f"📁 Upload directory: {UPLOAD_DIR}")
    print(f"🗄️  Database: SQLite (quizapp.db)")
    if mongo_collection:
        print(f"🍃 MongoDB: Connected")
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