from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import fitz  # PyMuPDF
from typing import List, Optional

from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import Draft, Quiz, Question
from parser import parse_quiz_text

# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class QuizRequest(BaseModel):
    text: str
    num_questions: Optional[int] = 5

class DraftRequest(BaseModel):
    id: Optional[int] = None
    raw_text: Optional[str] = None
    parsed_data: Optional[list] = None


@app.get("/")
async def root():
    return {"message": "Quiz Generator API is running"}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Extract text using PyMuPDF
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        
        # If text is empty, it might be a scanned PDF (OCR fallback would go here)
        if not text.strip():
            # For now, return a placeholder for OCR
            text = "[Empty PDF content. OCR fallback pending implementation...]"
            
        return {"filename": file.filename, "content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        # Optionally delete the file after processing
        # os.remove(file_path)
        pass

@app.post("/api/generate-quiz")
async def generate_quiz(request: QuizRequest):
    # Backward compatibility or fallback to AI logic if request text is empty
    try:
        parsed_questions = parse_quiz_text(request.text)
        return {"questions": parsed_questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-quiz")
async def parse_quiz(request: QuizRequest):
    try:
        parsed_questions = parse_quiz_text(request.text)
        return {"questions": parsed_questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


### NEW DRAFT ENDPOINTS ###

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088)

