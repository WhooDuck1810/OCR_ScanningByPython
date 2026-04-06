from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import time
import json

from database import get_db
from models import TimerSession, QuizSubmission

# ============ Pydantic Models for Timer ============

class InitTimerRequest(BaseModel):
    quiz_id: str
    time_limit: int  # in seconds
    started_at: int  # timestamp in milliseconds

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
    quiz_name: str
    answers: Dict[str, Any]
    results: list
    score: int
    total_questions: int
    percentage: float
    time_taken: int
    time_limit: int
    is_auto_submit: bool
    submitted_at: str
    time_remaining: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

# ============ Timer Session Management ============

class TimerManager:
    def __init__(self):
        self.active_sessions = {}  # In-memory cache for faster access
    
    def create_session(self, quiz_id: str, time_limit: int, started_at: datetime, db: Session) -> TimerSession:
        """Create a new timer session"""
        session = TimerSession(
            quiz_id=quiz_id,
            started_at=started_at,
            time_limit=time_limit,
            remaining_time=time_limit,
            is_active=1
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        # Cache in memory
        self.active_sessions[quiz_id] = session
        return session
    
    def get_session(self, quiz_id: str, db: Session) -> Optional[TimerSession]:
        """Get timer session from cache or database"""
        # Check cache first
        if quiz_id in self.active_sessions:
            return self.active_sessions[quiz_id]
        
        # Query from database
        session = db.query(TimerSession).filter(
            TimerSession.quiz_id == quiz_id,
            TimerSession.is_active == 1
        ).first()
        
        if session:
            self.active_sessions[quiz_id] = session
        
        return session
    
    def update_session(self, quiz_id: str, remaining_time: int, db: Session) -> bool:
        """Update session remaining time"""
        session = self.get_session(quiz_id, db)
        if not session:
            return False
        
        session.remaining_time = remaining_time
        session.last_sync_at = datetime.utcnow()
        db.commit()
        
        # Update cache
        self.active_sessions[quiz_id] = session
        return True
    
    def end_session(self, quiz_id: str, db: Session) -> bool:
        """Mark session as inactive"""
        session = self.get_session(quiz_id, db)
        if not session:
            return False
        
        session.is_active = 0
        db.commit()
        
        # Remove from cache
        if quiz_id in self.active_sessions:
            del self.active_sessions[quiz_id]
        
        return True
    
    def calculate_remaining_time(self, session: TimerSession) -> int:
        """Calculate remaining time based on server clock"""
        elapsed = int((datetime.utcnow() - session.started_at).total_seconds())
        remaining = max(0, session.time_limit - elapsed)
        return remaining

# Create global timer manager instance
timer_manager = TimerManager()

# ============ Timer API Handlers ============

async def init_timer_handler(request: InitTimerRequest, db: Session = Depends(get_db)):
    """Initialize a timer session for a quiz"""
    try:
        started_at = datetime.fromtimestamp(request.started_at / 1000)
        
        # Check if session already exists
        existing = timer_manager.get_session(request.quiz_id, db)
        if existing:
            # Return existing session
            remaining = timer_manager.calculate_remaining_time(existing)
            return {
                "status": "existing",
                "quiz_id": request.quiz_id,
                "started_at": existing.started_at.timestamp() * 1000,
                "remaining_time": remaining,
                "time_limit": existing.time_limit
            }
        
        # Create new session
        session = timer_manager.create_session(
            quiz_id=request.quiz_id,
            time_limit=request.time_limit,
            started_at=started_at,
            db=db
        )
        
        return {
            "status": "initialized",
            "quiz_id": request.quiz_id,
            "started_at": session.started_at.timestamp() * 1000,
            "remaining_time": session.remaining_time,
            "time_limit": session.time_limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize timer: {str(e)}")

async def sync_time_handler(request: SyncTimeRequest, db: Session = Depends(get_db)):
    """Sync client time with server"""
    try:
        session = timer_manager.get_session(request.quiz_id, db)
        if not session:
            raise HTTPException(status_code=404, detail="Timer session not found")
        
        # Update session with client's remaining time
        timer_manager.update_session(request.quiz_id, request.remaining_time, db)
        
        # Calculate server-side remaining time for validation
        server_remaining = timer_manager.calculate_remaining_time(session)
        
        return {
            "status": "synced",
            "quiz_id": request.quiz_id,
            "server_remaining": server_remaining,
            "client_remaining": request.remaining_time,
            "drift": server_remaining - request.remaining_time,
            "timestamp": request.timestamp
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync time: {str(e)}")

async def validate_time_handler(request: ValidateTimeRequest, db: Session = Depends(get_db)):
    """Validate client time against server (server authoritative)"""
    try:
        session = timer_manager.get_session(request.quiz_id, db)
        
        response = {
            "is_valid": True,
            "server_remaining": request.client_remaining,
            "server_elapsed": request.client_elapsed
        }
        
        if session:
            # Calculate expected remaining time based on server clock
            server_remaining = timer_manager.calculate_remaining_time(session)
            drift = server_remaining - request.client_remaining
            
            # Allow 3 seconds of drift
            if abs(drift) > 3:
                response["is_valid"] = False
                response["server_remaining"] = server_remaining
                response["drift"] = drift
                response["message"] = "Time drift detected, syncing with server"
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate time: {str(e)}")

async def submit_quiz_handler(request: SubmitQuizRequest, db: Session = Depends(get_db), http_request: Request = None):
    """Handle quiz submission"""
    try:
        # Get client IP if available
        client_ip = None
        if http_request:
            client_ip = http_request.client.host
        
        # Save submission to database
        submission = QuizSubmission(
            quiz_id=request.quiz_id,
            quiz_name=request.quiz_name,
            user_answers=request.answers,
            results=request.results,
            score=request.score,
            total_questions=request.total_questions,
            percentage=int(request.percentage),
            time_taken=request.time_taken,
            time_limit=request.time_limit,
            is_auto_submit=1 if request.is_auto_submit else 0,
            submitted_at=datetime.fromisoformat(request.submitted_at.replace('Z', '+00:00')),
            extra_data={
                "time_remaining": request.time_remaining,
                "client_ip": client_ip
            }
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        # End the timer session
        timer_manager.end_session(request.quiz_id, db)
        
        # Also save to localStorage-compatible format for frontend
        # This maintains compatibility with existing dashboard
        import json
        from pathlib import Path
        
        # Save to a JSON file for persistence (optional)
        submissions_dir = Path("submissions")
        submissions_dir.mkdir(exist_ok=True)
        
        submission_file = submissions_dir / f"{request.quiz_id}_{submission.id}.json"
        with open(submission_file, "w") as f:
            json.dump({
                "id": submission.id,
                "quiz_id": request.quiz_id,
                "quiz_name": request.quiz_name,
                "score": request.score,
                "total": request.total_questions,
                "percentage": request.percentage,
                "time_taken": request.time_taken,
                "is_auto_submit": request.is_auto_submit,
                "submitted_at": request.submitted_at
            }, f, indent=2)
        
        return {
            "status": "submitted",
            "submission_id": submission.id,
            "quiz_id": request.quiz_id,
            "score": request.score,
            "total": request.total_questions,
            "percentage": request.percentage
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")

async def get_submission_handler(submission_id: int, db: Session = Depends(get_db)):
    """Get a specific submission by ID"""
    submission = db.query(QuizSubmission).filter(QuizSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {
        "id": submission.id,
        "quiz_id": submission.quiz_id,
        "quiz_name": submission.quiz_name,
        "score": submission.score,
        "total_questions": submission.total_questions,
        "percentage": submission.percentage,
        "time_taken": submission.time_taken,
        "is_auto_submit": bool(submission.is_auto_submit),
        "submitted_at": submission.submitted_at.isoformat(),
        "results": submission.results
    }

async def get_quiz_submissions_handler(quiz_id: str, db: Session = Depends(get_db)):
    """Get all submissions for a specific quiz"""
    submissions = db.query(QuizSubmission).filter(
        QuizSubmission.quiz_id == quiz_id
    ).order_by(QuizSubmission.submitted_at.desc()).all()
    
    return [
        {
            "id": s.id,
            "score": s.score,
            "total_questions": s.total_questions,
            "percentage": s.percentage,
            "time_taken": s.time_taken,
            "is_auto_submit": bool(s.is_auto_submit),
            "submitted_at": s.submitted_at.isoformat()
        }
        for s in submissions
    ]

async def get_active_timer_handler(quiz_id: str, db: Session = Depends(get_db)):
    """Get active timer session for a quiz"""
    session = timer_manager.get_session(quiz_id, db)
    if not session:
        return {
            "is_active": False,
            "quiz_id": quiz_id
        }
    
    remaining = timer_manager.calculate_remaining_time(session)
    
    return {
        "is_active": True,
        "quiz_id": quiz_id,
        "started_at": session.started_at.timestamp() * 1000,
        "time_limit": session.time_limit,
        "remaining_time": remaining,
        "last_sync_at": session.last_sync_at.timestamp() * 1000
    }

async def cleanup_expired_sessions_handler(db: Session = Depends(get_db)):
    """Clean up expired timer sessions (older than 24 hours)"""
    cutoff = datetime.utcnow() - timedelta(hours=24)
    
    expired = db.query(TimerSession).filter(
        TimerSession.created_at < cutoff,
        TimerSession.is_active == 1
    ).all()
    
    count = 0
    for session in expired:
        session.is_active = 0
        count += 1
        
        # Remove from cache
        if session.quiz_id in timer_manager.active_sessions:
            del timer_manager.active_sessions[session.quiz_id]
    
    db.commit()
    
    return {
        "cleaned_up": count,
        "message": f"Removed {count} expired sessions"
    }