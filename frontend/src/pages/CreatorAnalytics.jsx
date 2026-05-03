import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function CreatorAnalytics() {
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPayload, setStatsPayload] = useState(null);

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/quizzes`);
        const data = Array.isArray(res.data) ? res.data : [];
        setQuizzes(data);
        if (data.length > 0) setQuizId(String(data[0].id));
      } catch (err) {
        console.error('Failed to load quizzes', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!quizId) return;
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/quiz/submissions/${quizId}`);
        setStatsPayload(res.data || null);
      } catch (err) {
        console.error('Failed to load quiz submissions', err);
        setStatsPayload(null);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [quizId]);

  const rows = useMemo(() => statsPayload?.submissions || [], [statsPayload]);
  const statistics = statsPayload?.statistics || { average_percentage: 0, max_percentage: 0, min_percentage: 0 };

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '16px' }}>
      <h2>Creator Analytics</h2>
      <p>Overview of all attempts and score distribution by quiz.</p>

      {loading ? (
        <p>Loading quizzes...</p>
      ) : (
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="quiz-selector" style={{ marginRight: '8px', fontWeight: 600 }}>Select Quiz:</label>
          <select id="quiz-selector" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                #{q.id} - {q.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {statsLoading ? (
        <p>Loading submissions...</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <StatCard title="Attempts" value={statsPayload?.total_attempts || 0} />
            <StatCard title="Average" value={`${statistics.average_percentage}%`} />
            <StatCard title="Highest" value={`${statistics.max_percentage}%`} />
            <StatCard title="Lowest" value={`${statistics.min_percentage}%`} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={thStyle}>Submission ID</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Percent</th>
                <th style={thStyle}>Time Taken</th>
                <th style={thStyle}>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={5}>No attempts yet for this quiz.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.id}</td>
                    <td style={tdStyle}>{row.score}/{row.total_questions}</td>
                    <td style={tdStyle}>{row.percentage}%</td>
                    <td style={tdStyle}>{row.time_taken}s</td>
                    <td style={tdStyle}>{row.submitted_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', minWidth: '140px' }}>
      <div style={{ fontSize: '12px', color: '#666' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '1px solid #ddd',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
};
