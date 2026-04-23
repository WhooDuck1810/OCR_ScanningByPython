import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function Dashboard() {
  const [history] = useState(() => {
    const data = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    return data.reverse(); // latest first
  });
  
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  // Modal states for Quiz Runner initialization
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState('normal'); // 'normal' or 'shuffle'
  const [timeLimitStr, setTimeLimitStr] = useState('300');
  const [questionLimitStr, setQuestionLimitStr] = useState('all');
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedQuizName, setSelectedQuizName] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/drafts/all`)
      .then(res => {
        setDrafts(res.data || []);
      })
      .catch(err => console.error("Error fetching drafts", err))
      .finally(() => setLoadingDrafts(false));
  }, []);

  const handleRetake = (record) => {
    if (!record.questions || record.questions.length === 0) {
      alert("This historical record doesn't have cached questions and cannot be retaken.\nAny quizzes taken from this point forward will have their questions cached for retaking!");
      return;
    }
    setSelectedQuestions(record.questions);
    setSelectedQuizName(`Retake: ${record.quizName}`);
    setSetupMode('normal');
    setShowSetup(true);
  };

  const handleOpenDraftSetup = async (draftId, mode) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/drafts/${draftId}`);
      if (!res.data || !res.data.parsed_data) {
        alert("Draft parsing error.");
        return;
      }
      setSelectedQuestions(res.data.parsed_data);
      setSelectedQuizName(`Draft #${draftId}`);
      setSetupMode(mode);
      setShowSetup(true);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch draft data.");
    }
  };

  const handleSetupStart = () => {
    const tl = parseInt(timeLimitStr, 10);
    const isShuffle = setupMode === 'shuffle';
    
    let finalQuestions = [...selectedQuestions];
    if (isShuffle) {
      finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
    }
    if (questionLimitStr !== 'all') {
      finalQuestions = finalQuestions.slice(0, parseInt(questionLimitStr, 10));
    }
    
    navigate('/enhanced-quiz', {
      state: {
        quizData: {
          name: selectedQuizName,
          questions: finalQuestions
        },
        timeLimit: tl > 0 ? tl : 999999,
        isShuffle: isShuffle,
        isShuffleAnswers: shuffleAnswers
      }
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Dashboard - Overview</h2>
        <button onClick={() => navigate('/editor')} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Create New Quiz</button>
      </div>

      {/* Cards View for Overview */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, padding: '20px', background: '#f1f8ff', border: '1px solid #c8e1ff', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#0366d6' }}>Quizzes Taken</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>{history.length}</p>
        </div>
        <div style={{ flex: 1, padding: '20px', background: '#e6ffed', border: '1px solid #acf2bd', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#22863a' }}>Avg Score</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {history.length ? Math.round((history.reduce((a, b) => a + (b.score / b.total), 0) / history.length) * 100) : 0}%
          </p>
        </div>
        <div style={{ flex: 1, padding: '20px', background: '#f4f4f5', border: '1px solid #d4d4d8', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#3f3f46' }}>Saved Drafts</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0 0 0' }}>{drafts.length}</p>
        </div>
      </div>

      {/* Draft Vault Section */}
      <h3 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px', marginTop: '40px' }}>Your Saved Drafts</h3>
      {loadingDrafts ? (
        <p style={{ color: '#6c757d' }}>Loading drafts...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '40px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Draft ID</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Last Updated</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Questions</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No saved drafts found.</td>
              </tr>
            ) : (
              drafts.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e9ecef', background: '#fff' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#666' }}>#{d.id}</td>
                  <td style={{ padding: '12px', color: '#666' }}>{new Date(d.updated_at).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#666' }}>{d.question_count}</td>
                  <td style={{ padding: '12px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => navigate('/editor')} style={{ padding: '6px 12px', background: '#f8f9fa', color: '#495057', border: '1px solid #ced4da', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Edit Content</button>
                    <button onClick={() => handleOpenDraftSetup(d.id, 'normal')} style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Take Normal</button>
                    <button onClick={() => handleOpenDraftSetup(d.id, 'shuffle')} style={{ padding: '6px 12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Shuffle</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Historical Table View */}
      <h3 style={{ borderBottom: '2px solid #eaecef', paddingBottom: '10px' }}>Past Results</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Quiz Name</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Score</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Accuracy</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No quizzes taken yet.</td>
            </tr>
          ) : (
            history.map((record, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e9ecef', background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '12px', color: '#666' }}>{record.date}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#444' }}>{record.quizName}</td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#444' }}>{record.score} / {record.total}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', background: (record.score / record.total) >= 0.7 ? '#e6ffed' : '#ffeef0', color: (record.score / record.total) >= 0.7 ? '#22863a' : '#cb2431', fontSize: '14px', fontWeight: 'bold' }}>
                    {Math.round((record.score / record.total) * 100)}%
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <button onClick={() => handleRetake(record)} style={{ padding: '6px 12px', background: record.questions ? '#0366d6' : '#a0c4ff', color: 'white', border: 'none', borderRadius: '4px', cursor: record.questions ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 'bold' }}>
                    Retake
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Quiz Setup Modal (Replicated from Editor for Dashboard Executions) */}
      {showSetup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>Quiz Setup</h2>
            <p style={{ color: '#666', marginBottom: '10px' }}>Target: <strong>{selectedQuizName}</strong></p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Mode: <strong>{setupMode === 'normal' ? 'Normal (Ordered)' : 'Shuffle Questions'}</strong>
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#444' }}>Question Limit:</label>
              <select 
                value={questionLimitStr}
                onChange={(e) => setQuestionLimitStr(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', color: '#333' }}
              >
                <option value="all">Take All Questions ({selectedQuestions.length})</option>
                {[5, 10, 15, 20, 25, 30, 40, 50].filter(n => n < selectedQuestions.length).map(n => (
                  <option key={n} value={n.toString()}>{n} Questions</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#444' }}>Select Time Limit:</label>
              <select 
                value={timeLimitStr}
                onChange={(e) => setTimeLimitStr(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', color: '#333' }}
              >
                <option value="0">No Timer (Unlimited)</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1800">30 Minutes</option>
                <option value="3600">60 Minutes</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                onClick={() => setShuffleAnswers(!shuffleAnswers)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '6px', background: shuffleAnswers ? '#f5f3ff' : '#fff', userSelect: 'none' }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${shuffleAnswers ? '#8b5cf6' : '#ccc'}`, background: shuffleAnswers ? '#8b5cf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {shuffleAnswers && <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                </div>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>🔀 Shuffle Answer Choices</span>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>Randomize the order of options within each question</p>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleSetupStart} 
                style={{ padding: '12px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Start Quiz Now
              </button>
              <button 
                onClick={() => setShowSetup(false)} 
                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
