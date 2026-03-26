import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    setHistory(data.reverse()); // latest first
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Dashboard - Past Results</h2>
        <button onClick={() => navigate('/editor')} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create New Quiz</button>
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
      </div>

      {/* Table View */}
      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Quiz Name</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Score</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No quizzes taken yet.</td>
            </tr>
          ) : (
            history.map((record, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e9ecef', background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '12px' }}>{record.date}</td>
                <td style={{ padding: '12px' }}>{record.quizName}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{record.score} / {record.total}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', background: (record.score / record.total) >= 0.7 ? '#e6ffed' : '#ffeef0', color: (record.score / record.total) >= 0.7 ? '#22863a' : '#cb2431', fontSize: '14px', fontWeight: 'bold' }}>
                    {Math.round((record.score / record.total) * 100)}%
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
