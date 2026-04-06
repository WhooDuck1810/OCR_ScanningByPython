from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    question_text = Column(Text, nullable=False)
    choices_list = Column(JSON, nullable=False)  # Array of strings
    correct_answer = Column(String, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")

class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)



# ============ NEW TIMER AND SUBMISSION MODELS ============

class TimerSession(Base):
    __tablename__ = "timer_sessions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(String, index=True, nullable=False)
    started_at = Column(DateTime, nullable=False)
    time_limit = Column(Integer, nullable=False)  # in seconds
    last_sync_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    remaining_time = Column(Integer, nullable=False)
    is_active = Column(Integer, default=1)  # 1 for active, 0 for expired
    client_ip = Column(String, nullable=True)
    session_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizSubmission(Base):
    __tablename__ = "quiz_submissions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(String, index=True, nullable=False)
    quiz_name = Column(String, nullable=False)
    user_answers = Column(JSON)  # Store answers as JSON
    results = Column(JSON)  # Store detailed results
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    percentage = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)  # in seconds
    time_limit = Column(Integer, default=0)
    is_auto_submit = Column(Integer, default=0)  # 0 for manual, 1 for auto
    submitted_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String, nullable=True)  # For future user authentication
    extra_data = Column(JSON, nullable=True)  # For any additional data