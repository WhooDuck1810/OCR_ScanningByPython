import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const EnhancedResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    results, 
    questions,
    originalQuestions = [],
    quizName: passedQuizName = '',
    timeLimit: passedTimeLimit = 300,
    canShowAnswers: canShowAnswersFromState = false
  } = location.state || {};
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect'
  const [retakeShuffleAnswers, setRetakeShuffleAnswers] = useState(true);

  if (!results) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>📭</div>
          <h2 style={styles.errorTitle}>No results found</h2>
          <p style={styles.errorMessage}>Please complete a quiz to see results.</p>
          <div style={styles.buttonGroup}>
            <button onClick={() => navigate('/')} style={styles.primaryButton}>
              🏠 Go to Home
            </button>
            <button onClick={() => navigate('/editor')} style={styles.secondaryButton}>
              ✏️ Create Quiz
            </button>
          </div>
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
    results: detailedResults,
    quiz_name
  } = results;

  const minutes = Math.floor(time_taken / 60);
  const seconds = time_taken % 60;
  const totalMinutes = Math.floor(time_limit / 60);
  
  // Calculate statistics
  const correctCount = score;
  const incorrectCount = total_questions - score;
  const accuracy = ((score / total_questions) * 100).toFixed(1);
  
  const canShowAnswers = Boolean(results?.can_show_answers ?? canShowAnswersFromState);
  const safeDetailedResults = canShowAnswers ? (Array.isArray(detailedResults) ? detailedResults : []) : [];

  // Filter questions based on selection
  const filteredQuestions = safeDetailedResults.filter((_, idx) => {
    if (filter === 'correct') return safeDetailedResults[idx].isCorrect;
    if (filter === 'incorrect') return !safeDetailedResults[idx].isCorrect;
    return true;
  });

  const getScoreColor = () => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreMessage = () => {
    if (percentage >= 90) return '🏆 Outstanding! You\'re a true expert!';
    if (percentage >= 80) return '🌟 Excellent work! You really know your stuff!';
    if (percentage >= 70) return '👍 Very good! Just a few more to master.';
    if (percentage >= 60) return '📚 Good job! Keep practicing to improve further.';
    if (percentage >= 50) return '💪 Fair effort! Review the material and try again.';
    return '📖 Need more practice. Review the answers below and try again!';
  };

  const getPerformanceLabel = () => {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getPerformanceColor = () => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    if (percentage >= 40) return '#f97316';
    return '#ef4444';
  };

  const toggleQuestionExpand = (index) => {
    if (expandedQuestion === index) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(index);
    }
  };

  const downloadResults = () => {
    const data = {
      quiz_name,
      score,
      total_questions,
      percentage,
      accuracy,
      time_taken,
      time_limit,
      submitted_at: new Date().toISOString(),
      results: detailedResults
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_results_${quiz_name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.successIcon}>
            {percentage >= 70 ? '🎉' : percentage >= 50 ? '📊' : '📚'}
          </div>
          <h1 style={styles.title}>Quiz Results</h1>
          <p style={styles.quizName}>{quiz_name || 'Quiz'}</p>
        </div>

        {/* Score Section */}
        <div style={styles.scoreSection}>
          <div style={styles.scoreCircle}>
            <div style={{...styles.scoreNumber, color: getScoreColor()}}>{score}</div>
            <div style={styles.scoreTotal}>/{total_questions}</div>
          </div>
          <div style={{...styles.percentage, color: getScoreColor()}}>
            {Math.round(percentage)}%
          </div>
          <div style={{...styles.performanceBadge, backgroundColor: getPerformanceColor() + '20', color: getPerformanceColor()}}>
            {getPerformanceLabel()}
          </div>
        </div>

        {/* Statistics Grid */}
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
            <div style={styles.statValue}>{is_auto_submit ? '⏰ Auto-submitted' : ' Manual'}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>✅ Correct Answers</div>
            <div style={{...styles.statValue, color: '#10b981'}}>{correctCount}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>❌ Incorrect Answers</div>
            <div style={{...styles.statValue, color: '#ef4444'}}>{incorrectCount}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>🎯 Accuracy</div>
            <div style={styles.statValue}>{accuracy}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressLabel}>Overall Performance</div>
          <div style={styles.progressBarContainer}>
            <div style={{...styles.progressBarFill, width: `${percentage}%`, backgroundColor: getScoreColor()}} />
          </div>
          <div style={styles.progressStats}>
            <span style={{ color: '#10b981' }}>✅ {correctCount} Correct</span>
            <span style={{ color: '#ef4444' }}>❌ {incorrectCount} Incorrect</span>
            <span style={{ color: '#94a3b8' }}>📊 {accuracy}% Accuracy</span>
          </div>
        </div>

        {/* Message */}
        <div style={styles.message}>
          {getScoreMessage()}
        </div>

        {/* Detailed Question Review */}
        {canShowAnswers ? (
        <div style={styles.detailsSection}>
          <div style={styles.detailsHeader}>
            <h3 style={styles.detailsTitle}>
              📋 Detailed Question Review
            </h3>
            <div style={styles.filterButtons}>
              <button 
                onClick={() => setFilter('all')} 
                style={{...styles.filterButton, ...(filter === 'all' ? styles.filterButtonActive : {})}}
              >
                All ({total_questions})
              </button>
              <button 
                onClick={() => setFilter('correct')} 
                style={{...styles.filterButton, ...(filter === 'correct' ? styles.filterButtonActive : {}), color: '#10b981'}}
              >
                ✅ Correct ({correctCount})
              </button>
              <button 
                onClick={() => setFilter('incorrect')} 
                style={{...styles.filterButton, ...(filter === 'incorrect' ? styles.filterButtonActive : {}), color: '#ef4444'}}
              >
                ❌ Incorrect ({incorrectCount})
              </button>
            </div>
          </div>
          <p style={styles.detailsSubtitle}>
            💡 Click on any question to see detailed explanation
          </p>
          
          <div style={styles.detailsList}>
            {(Array.isArray(filteredQuestions) ? filteredQuestions : []).map((result, idx) => {
              const originalIndex = detailedResults.findIndex(r => r === result);
              return (
                <div 
                  key={originalIndex} 
                  style={{
                    ...styles.detailItem,
                    borderLeft: `4px solid ${result.isCorrect ? '#10b981' : '#ef4444'}`
                  }}
                >
                  <div 
                    style={styles.detailHeader}
                    onClick={() => toggleQuestionExpand(originalIndex)}
                  >
                    <div style={styles.detailNumber}>
                      <span style={styles.questionNumber}>Question {originalIndex + 1}</span>
                      <span style={result.isCorrect ? styles.correctBadge : styles.incorrectBadge}>
                        {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                      {!result.isCorrect && (
                        <span style={styles.pointsLost}>-{Math.round(100 / total_questions)} pts</span>
                      )}
                    </div>
                    <div style={styles.expandIcon}>
                      {expandedQuestion === originalIndex ? '▲' : '▼'}
                    </div>
                  </div>
                  
                  <div style={styles.detailQuestion}>
                    <strong>{result.question}</strong>
                  </div>
                  
                  <div style={styles.detailAnswers}>
                    <div style={result.isCorrect ? styles.userAnswerCorrect : styles.userAnswerIncorrect}>
                      <strong>Your answer:</strong> {result.userAnswer || 'Not answered'}
                      {!result.isCorrect && result.userAnswer && (
                        <span style={styles.wrongMark}> ✗</span>
                      )}
                      {!result.userAnswer && (
                        <span style={styles.unansweredMark}> (Not answered - 0 points)</span>
                      )}
                    </div>
                    
                    {!result.isCorrect && (
                      <div style={styles.correctAnswer}>
                        <strong>Correct answer:</strong> {result.correctAnswer}
                        <span style={styles.correctMark}> ✓</span>
                      </div>
                    )}
                    
                    {result.isCorrect && result.userAnswer && (
                      <div style={styles.correctMarkInline}>
                        ✓ Correct! Great job!
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded explanation section */}
                  {expandedQuestion === originalIndex && (
                    <div style={styles.expandedContent}>
                      <div style={styles.explanationBox}>
                        <strong style={{ color: 'white' }}>📖 Detailed Explanation:</strong>
                        <p style={styles.explanationText}>
                          {result.isCorrect 
                            ? `Excellent! "${result.correctAnswer}" is the correct answer. You earned ${Math.round(100 / total_questions)} points for this question.`
                            : `The correct answer is "${result.correctAnswer}". ${result.userAnswer ? `You selected "${result.userAnswer}"` : 'You did not answer this question'}. You lost ${Math.round(100 / total_questions)} points.`
                          }
                        </p>
                        {!result.isCorrect && result.correctAnswer && (
                          <div style={styles.learningTip}>
                            💡 <strong>Learning Tip:</strong> Remember that {result.correctAnswer} is the correct choice. Review this topic to improve your score!
                          </div>
                        )}
                        {result.isCorrect && (
                          <div style={styles.successTip}>
                            🎯 <strong>Keep it up!</strong> You've mastered this concept.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        ) : (
          <div style={styles.message}>
            Creator is not allowing detailed answer review for this quiz.
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <button onClick={() => navigate('/dashboard')} style={styles.primaryButton}>
            📊 View Dashboard
          </button>
          <button onClick={() => navigate('/editor')} style={styles.secondaryButton}>
            ✏️ Create New Quiz
          </button>
          <button onClick={downloadResults} style={styles.downloadButton}>
            📥 Download Results
          </button>
          <button onClick={() => navigate('/')} style={styles.secondaryButton}>
            🏠 Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles (same as before)
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
    maxWidth: '1000px',
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
  quizName: {
    fontSize: '16px',
    color: '#94a3b8',
    marginTop: '8px',
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
    marginBottom: '8px',
  },
  performanceBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
  progressSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
  },
  progressLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '12px',
    textAlign: 'center',
  },
  progressBarContainer: {
    height: '12px',
    backgroundColor: '#334155',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.5s ease',
    borderRadius: '6px',
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#94a3b8',
  },
  message: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    marginBottom: '32px',
    color: '#cbd5e1',
    fontSize: '16px',
    lineHeight: '1.5',
  },
  detailsSection: {
    marginBottom: '32px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  detailsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '6px 12px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  detailsSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  detailsList: {
    maxHeight: '500px',
    overflowY: 'auto',
    borderRadius: '12px',
  },
  detailItem: {
    backgroundColor: '#0f172a',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  detailNumber: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  questionNumber: {
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
  pointsLost: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  expandIcon: {
    color: '#64748b',
    fontSize: '12px',
    cursor: 'pointer',
  },
  detailQuestion: {
    color: '#f1f5f9',
    marginBottom: '12px',
    fontSize: '15px',
    lineHeight: '1.4',
  },
  detailAnswers: {
    fontSize: '14px',
  },
  userAnswerCorrect: {
    color: '#10b981',
    marginBottom: '4px',
    padding: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
  },
  userAnswerIncorrect: {
    color: '#ef4444',
    marginBottom: '4px',
    padding: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
  },
  correctAnswer: {
    color: '#10b981',
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
  },
  wrongMark: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  correctMark: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  correctMarkInline: {
    marginTop: '8px',
    color: '#10b981',
    fontSize: '13px',
    fontWeight: '500',
  },
  unansweredMark: {
    color: '#f59e0b',
    fontSize: '12px',
  },
  expandedContent: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  explanationBox: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
  },
  explanationText: {
    marginTop: '8px',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  learningTip: {
    marginTop: '12px',
    padding: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '6px',
    color: '#60a5fa',
    fontSize: '13px',
  },
  successTip: {
    marginTop: '12px',
    padding: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '6px',
    color: '#34d399',
    fontSize: '13px',
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
    flexWrap: 'wrap',
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
    minWidth: '150px',
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
    minWidth: '150px',
  },
  downloadButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    minWidth: '150px',
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

// Add keyframes to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default EnhancedResults;