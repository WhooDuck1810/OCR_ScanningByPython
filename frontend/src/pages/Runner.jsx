import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { shuffleQuiz } from '../utils/shuffle';
import { API_BASE_URL } from '../config';

export default function Runner() {
  const [questions, setQuestions] = useState([]);
  const [originalQuestions, setOriginalQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffleAnswersOn, setShuffleAnswersOn] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/drafts/latest`).then(res => {
      if (res.data && res.data.parsed_data) {
        setOriginalQuestions(res.data.parsed_data);
        setQuestions(shuffleQuiz(res.data.parsed_data));
      }
    }).catch(err => console.error("Error loading quiz", err));
  }, []);

  const handleSelect = (choice) => {
    setSelectedAnswers({ ...selectedAnswers, [currentIndex]: choice });
  };

  const currentQ = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
      let finalScore = 0;
      questions.forEach((q, i) => {
        const isCorrect = selectedAnswers[i] && selectedAnswers[i].startsWith(q.answer);
        if (isCorrect) finalScore++;
      });
      setScore(finalScore);
      const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      history.push({
        date: new Date().toLocaleDateString(),
        quizName: 'Sprint 2 Quiz',
        score: finalScore,
        total: questions.length,
        questions: originalQuestions,
      });
      localStorage.setItem('quizHistory', JSON.stringify(history));
    }
  };

  const handleRetake = (shuffleQs) => {
    setQuestions(shuffleQuiz(originalQuestions, { shuffleQuestions: shuffleQs, shuffleAnswers: shuffleAnswersOn }));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsFinished(false);
    setScore(0);
  };

  if (!questions.length) return <div style={{ padding: '20px' }}>Loading question data...</div>;

  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '30px', textAlign: 'center', border: '1px solid #e1e4e8', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '8px' }}>Quiz Complete!</h2>
        <p style={{ fontSize: '36px', fontWeight: 'bold', color: pct >= 70 ? '#28a745' : pct >= 40 ? '#f59e0b' : '#ef4444', margin: '16px 0 4px' }}>
          {score} / {questions.length}
        </p>
        <p style={{ color: '#666', marginBottom: '24px' }}>{pct}% correct</p>

        <label
          onClick={() => setShuffleAnswersOn(!shuffleAnswersOn)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: '14px', padding: '8px 14px', border: `1px solid ${shuffleAnswersOn ? '#8b5cf6' : '#d1d5da'}`, borderRadius: '6px', background: shuffleAnswersOn ? '#f5f3ff' : '#fff' }}
        >
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${shuffleAnswersOn ? '#8b5cf6' : '#ccc'}`, background: shuffleAnswersOn ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {shuffleAnswersOn && <span style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
          </div>
          <span style={{ fontSize: '14px', color: '#444' }}>🔀 Shuffle answer choices</span>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <button onClick={() => handleRetake(true)} style={{ padding: '12px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
            🔀 Retake & Shuffle Questions
          </button>
          <button onClick={() => handleRetake(false)} style={{ padding: '12px 20px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
            🔁 Retake Same Order
          </button>
        </div>

        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #e1e4e8', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', background: '#e1e4e8', borderRadius: '4px', marginBottom: '20px' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: '#28a745', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '20px' }}>
        <span>Question {currentIndex + 1} of {questions.length}</span>
      </div>

      <h2 style={{ marginBottom: '20px' }}>{currentQ.id}. {currentQ.question}</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        {currentQ.options.map((opt, i) => {
          const isSelected = selectedAnswers[currentIndex] === opt;
          return (
            <div 
              key={i} 
              onClick={() => handleSelect(opt)}
              style={{
                padding: '15px',
                border: `2px solid ${isSelected ? '#007bff' : '#d1d5da'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                background: isSelected ? '#f1f8ff' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              {opt}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleNext}
          disabled={!selectedAnswers[currentIndex]}
          style={{ padding: '10px 30px', background: selectedAnswers[currentIndex] ? '#007bff' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedAnswers[currentIndex] ? 'pointer' : 'not-allowed', fontSize: '16px' }}
        >
          {currentIndex < questions.length - 1 ? 'Next' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}
