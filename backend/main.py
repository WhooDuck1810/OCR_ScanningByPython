from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import fitz  # PyMuPDF
from typing import List, Optional

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
    # Mock implementation - in a real app, this would call an LLM
    mock_questions = [
        {
            "id": 1,
            "question": "What is the primary purpose of the document?",
            "options": ["To inform", "To persuade", "To entertain", "To instruct"],
            "answer": "To inform"
        },
        {
            "id": 2,
            "question": "Which of the following is mentioned as a key concept?",
            "options": ["Concept A", "Concept B", "Concept C", "None of the above"],
            "answer": "Concept A"
        },
        {
            "id": 3,
            "question": "According to the text, what is the first step?",
            "options": ["Step 1", "Step 2", "Step 3", "Step 4"],
            "answer": "Step 1"
        },
         {
            "id": 4,
            "question": "What is the conclusion regarding the main topic?",
            "options": ["Positive", "Negative", "Neutral", "Uncertain"],
            "answer": "Positive"
        }
    ]
    
    # In a real scenario, use request.text to generate questions
    return {"questions": mock_questions}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088)

