import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const EnhancedResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { results, originalQuestions, quizName: passedQuizName, timeLimit: passedTimeLimit } = location.state || {};
  const [retakeShuffleAnswers, setRetakeShuffleAnswers] = useState(true);

  if (!results) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>📭</div>
          <h2 style={styles.errorTitle}>No results found</h2>
          <p style={styles.errorMessage}>Please complete a quiz to see results.</p>
          <button onClick={() => navigate('/')} style={styles.primaryButton}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { 
    score, 
    total_questions, 
    percentage, 
    time_taken, 
    time_limit, 
    is_auto_submit,
    results: detailedResults 
  } = results;

  const minutes = Math.floor(time_taken / 60);
  const seconds = time_taken % 60;
  const totalMinutes = Math.floor(time_limit / 60);
  
  const getScoreColor = () => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreMessage = () => {
    if (percentage >= 80) return '🌟 Excellent work! You really know your stuff!';
    if (percentage >= 60) return '👍 Good job! Keep practicing to improve further.';
    if (percentage >= 40) return '📚 Good effort! Review the material and try again.';
    return '💪 Keep learning! Review the material thoroughly and try again.';
  };

  const canRetake = originalQuestions && originalQuestions.length > 0;

  const handleRetake = (shuffle) => {
    navigate('/enhanced-quiz', {
      state: {
        quizData: {
          name: passedQuizName || results.quiz_name || 'Retake Quiz',
          questions: originalQuestions,
        },
        timeLimit: passedTimeLimit || results.time_limit || 300,
        isShuffle: shuffle,
        isShuffleAnswers: retakeShuffleAnswers,
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.successIcon}>
            {percentage >= 70 ? '🎉' : '📚'}
          </div>
          <h1 style={styles.title}>Quiz Results</h1>
        </div>

        <div style={styles.scoreSection}>
          <div style={styles.scoreCircle}>
            <div style={{...styles.scoreNumber, color: getScoreColor()}}>{score}</div>
            <div style={styles.scoreTotal}>/{total_questions}</div>
          </div>
          <div style={{...styles.percentage, color: getScoreColor()}}>
            {Math.round(percentage)}%
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>⏱️ Time Taken</div>
            <div style={styles.statValue}>{minutes}m {seconds}s</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>📋 Time Limit</div>
            <div style={styles.statValue}>{totalMinutes} minutes</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>📝 Submission Type</div>
            <div style={styles.statValue}>{is_auto_submit ? '⏰ Auto-submitted' : '✓ Manual'}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>🎯 Accuracy</div>
            <div style={styles.statValue}>{((score / total_questions) * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div style={styles.message}>
          {getScoreMessage()}
        </div>

        {detailedResults && detailedResults.length > 0 && (
          <div style={styles.detailsSection}>
            <h3 style={styles.detailsTitle}>Question Summary</h3>
            <div style={styles.detailsList}>
              {detailedResults.map((result, idx) => (
                <div key={idx} style={styles.detailItem}>
                  <div style={styles.detailHeader}>
                    <span style={styles.detailNumber}>Q{idx + 1}</span>
                    <span style={result.isCorrect ? styles.correctBadge : styles.incorrectBadge}>
                      {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  <div style={styles.detailQuestion}>{result.question}</div>
                  <div style={styles.detailAnswers}>
                    <div style={styles.userAnswer}>
                      <strong>Your answer:</strong> {result.userAnswer}
                    </div>
                    {!result.isCorrect && (
                      <div style={styles.correctAnswer}>
                        <strong>Correct answer:</strong> {result.correctAnswer}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canRetake && (
          <div style={styles.retakeSection}>
            <h3 style={styles.retakeSectionTitle}>Retake This Quiz</h3>
            <label
              onClick={() => setRetakeShuffleAnswers(!retakeShuffleAnswers)}
              style={styles.shuffleAnswersToggle}
            >
              <div style={{
                ...styles.toggleCheckbox,
                backgroundColor: retakeShuffleAnswers ? '#f59e0b' : 'transparent',
                borderColor: retakeShuffleAnswers ? '#f59e0b' : '#475569',
              }}>
                {retakeShuffleAnswers && <span style={{ color: '#0f172a', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
              </div>
              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>🔀 Shuffle answer choices</span>
            </label>
            <div style={styles.retakeButtonGroup}>
              <button onClick={() => handleRetake(true)} style={styles.retakeShuffleButton}>
                🔀 Retake & Shuffle Questions
              </button>
              <button onClick={() => handleRetake(false)} style={styles.retakeSameButton}>
                🔁 Retake Same Order
              </button>
            </div>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button onClick={() => navigate('/dashboard')} style={styles.primaryButton}>
            View Dashboard
          </button>
          <button onClick={() => navigate('/')} style={styles.secondaryButton}>
            Take Another Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '800px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '32px',
    color: '#f1f5f9',
    margin: 0,
  },
  scoreSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  scoreCircle: {
    display: 'inline-flex',
    alignItems: 'baseline',
    backgroundColor: '#0f172a',
    padding: '20px 40px',
    borderRadius: '60px',
    marginBottom: '16px',
  },
  scoreNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
  },
  scoreTotal: {
    fontSize: '24px',
    color: '#64748b',
    marginLeft: '8px',
  },
  percentage: {
    fontSize: '36px',
    fontWeight: 'bold',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#0f172a',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  message: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    marginBottom: '32px',
    color: '#cbd5e1',
    fontSize: '16px',
  },
  detailsSection: {
    marginBottom: '32px',
  },
  detailsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#f1f5f9',
  },
  detailsList: {
    maxHeight: '400px',
    overflowY: 'auto',
    borderRadius: '12px',
  },
  detailItem: {
    backgroundColor: '#0f172a',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '12px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  detailNumber: {
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  correctBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  incorrectBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  detailQuestion: {
    color: '#f1f5f9',
    marginBottom: '12px',
    fontSize: '14px',
  },
  detailAnswers: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  userAnswer: {
    marginBottom: '4px',
  },
  correctAnswer: {
    color: '#10b981',
  },
  retakeSection: {
    marginBottom: '24px',
    padding: '24px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  retakeSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '16px',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  shuffleAnswersToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '10px 14px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    border: '1px solid #334155',
    marginBottom: '14px',
  },
  toggleCheckbox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '2px solid #475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  retakeButtonGroup: {
    display: 'flex',
    gap: '12px',
  },
  retakeShuffleButton: {
    flex: 1,
    padding: '14px 24px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  retakeSameButton: {
    flex: 1,
    padding: '14px 24px',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
  },
  primaryButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorIcon: {
    fontSize: '64px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '24px',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: '12px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: '24px',
  },
};

export default EnhancedResults;