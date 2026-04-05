import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { shuffleQuiz } from '../utils/shuffle';

export default function Runner() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8088/api/drafts/latest').then(res => {
      if (res.data && res.data.parsed_data) {
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
      // Save result to localStorage for Dashboard
      let score = 0;
      questions.forEach((q, i) => {
        // Simple mock check
        const isCorrect = selectedAnswers[i] && selectedAnswers[i].startsWith(q.answer);
        if (isCorrect) score++;
      });
      const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      history.push({
        date: new Date().toLocaleDateString(),
        quizName: 'Sprint 2 Quiz',
        score: score,
        total: questions.length
      });
      localStorage.setItem('quizHistory', JSON.stringify(history));
    }
  };

  if (!questions.length) return <div style={{ padding: '20px' }}>Loading question data...</div>;

  if (isFinished) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Quiz Complete!</h2>
        <p>Check the Dashboard to see your results.</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Go to Dashboard</button>
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
