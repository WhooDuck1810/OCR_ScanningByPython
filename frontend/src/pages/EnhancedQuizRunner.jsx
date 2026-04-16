import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const EnhancedQuizRunner = ({ quizId: propQuizId, quizData: propQuizData, timeLimit: propTimeLimit = 300 }) => {
  const navigate = useNavigate();
  const { quizId: paramQuizId } = useParams();
  const quizId = propQuizId || paramQuizId || 'draft';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(propTimeLimit);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [quizStartedAt, setQuizStartedAt] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle');
  const [showSidebar, setShowSidebar] = useState(true);
  const [quizName, setQuizName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef(null);
  const autoSubmitTriggered = useRef(false);
  const syncIntervalRef = useRef(null);
  const timerStartedRef = useRef(false);

  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      setIsLoading(true);
      try {
        if (propQuizData && propQuizData.questions) {
          setQuestions(propQuizData.questions);
          setQuizName(propQuizData.name || 'Enhanced Quiz');
          setTimeLeft(propTimeLimit);
        } else if (quizId !== 'draft') {
          const response = await axios.get(`http://localhost:8088/api/quizzes/${quizId}`);
          setQuestions(response.data.questions);
          setQuizName(response.data.name);
          setTimeLeft(propTimeLimit);
        } else {
          const response = await axios.get('http://localhost:8088/api/drafts/latest');
          if (response.data && response.data.parsed_data) {
            setQuestions(response.data.parsed_data);
            setQuizName('Draft Quiz');
            setTimeLeft(propTimeLimit);
          }
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuiz();
  }, [quizId, propQuizData, propTimeLimit]);
  // After setQuestions, add this debug code
  useEffect(() => {
    if (questions.length > 0) {
      console.log('=== QUIZ DATA DEBUG ===');
      questions.forEach((q, idx) => {
        console.log(`Q${idx + 1}:`, {
          question: q.question,
          answer: q.answer,
          correct_answer: q.correct_answer,
          options: q.options,
          hasAnswer: !!(q.answer || q.correct_answer)
        });
      });
    }
  }, [questions]);
  // Initialize quiz start time and load saved state
  useEffect(() => {
    if (questions.length > 0 && !quizStartedAt && !isSubmitted && !isLoading) {
      const savedState = localStorage.getItem(`enhanced_quiz_state_${quizId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
        if (elapsed < timeLeft && !parsed.isSubmitted) {
          setAnswers(parsed.answers || {});
          setMarkedForReview(parsed.markedForReview || {});
          setCurrentIndex(parsed.currentIndex || 0);
          setTimeLeft(Math.max(0, timeLeft - elapsed));
          setQuizStartedAt(parsed.startedAt);
          return;
        }
      }
      setQuizStartedAt(Date.now());

      const initBackendTimer = async () => {
        try {
          await axios.post('http://localhost:8088/api/quiz/init-timer', {
            quiz_id: quizId,
            time_limit: timeLeft,
            started_at: Date.now()
          });
        } catch (error) {
          console.error('Failed to initialize backend timer:', error);
        }
      };
      initBackendTimer();
    }
  }, [questions, quizId, timeLeft, isSubmitted, isLoading, quizStartedAt]);

  // HELPER FUNCTION: Check if answer is correct
  const isAnswerCorrect = useCallback((question, userAnswer) => {
    if (!userAnswer || !question) return false;

    let correctAnswer = question.answer || question.correct_answer;

    if (correctAnswer && /^[A-Da-d]$/.test(correctAnswer)) {
      const optionIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;
      if (question.options && question.options[optionIndex]) {
        correctAnswer = question.options[optionIndex];
      }
    }

    const normalizedUserAnswer = String(userAnswer).trim().toLowerCase();
    const normalizedCorrectAnswer = String(correctAnswer).trim().toLowerCase();

    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      return true;
    }

    if (question.options) {
      for (let i = 0; i < question.options.length; i++) {
        const optionText = question.options[i].trim().toLowerCase();
        if (normalizedUserAnswer === optionText && optionText === normalizedCorrectAnswer) {
          return true;
        }
        if (/^[A-Da-d]$/.test(normalizedUserAnswer)) {
          const letterIndex = normalizedUserAnswer.toUpperCase().charCodeAt(0) - 65;
          if (question.options[letterIndex] && question.options[letterIndex].trim().toLowerCase() === normalizedCorrectAnswer) {
            return true;
          }
        }
      }
    }

    return false;
  }, []);

  // DEFINE submitQuiz
  const submitQuiz = useCallback(async (isAutoSubmit = false) => {
    if (isSubmitted) return;

    console.log('submitQuiz called:', { isAutoSubmit, isSubmitted });

    setSubmissionStatus('submitting');

    try {
      let score = 0;
      const results = questions.map((q, idx) => {
        const userAnswer = answers[idx];
        const isCorrect = isAnswerCorrect(q, userAnswer);

        if (isCorrect) score++;

        let correctAnswerText = q.answer || q.correct_answer;
        if (correctAnswerText && /^[A-Da-d]$/.test(correctAnswerText)) {
          const optionIndex = correctAnswerText.toUpperCase().charCodeAt(0) - 65;
          if (q.options && q.options[optionIndex]) {
            correctAnswerText = q.options[optionIndex];
          }
        }

        return {
          questionId: q.id || idx,
          question: q.question,
          userAnswer: userAnswer || 'Not answered',
          correctAnswer: correctAnswerText,
          isCorrect,
        };
      });

      const timeTaken = propTimeLimit - timeLeft;
      const percentage = (score / questions.length) * 100;

      const submissionData = {
        quiz_id: quizId,
        quiz_name: quizName,
        answers,
        results,
        score,
        total_questions: questions.length,
        percentage: percentage,
        time_taken: timeTaken,
        time_limit: propTimeLimit,
        is_auto_submit: isAutoSubmit,
        submitted_at: new Date().toISOString(),
        time_remaining: timeLeft,
      };

      try {
        await axios.post('http://localhost:8088/api/quiz/submit', submissionData);
        console.log('Backend submission successful');
      } catch (error) {
        console.error('Backend save failed, saving locally:', error);
      }

      const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      history.push({
        date: new Date().toLocaleString(),
        quizName: quizName,
        score,
        total: questions.length,
        percentage: percentage,
        timeTaken: timeTaken,
        isAutoSubmit,
      });
      localStorage.setItem('quizHistory', JSON.stringify(history));

      localStorage.removeItem(`enhanced_quiz_state_${quizId}`);

      setIsSubmitted(true);
      setSubmissionStatus('success');

      setTimeout(() => {
        navigate('/enhanced-results', { state: { results: submissionData, questions } });
      }, 1500);

    } catch (error) {
      console.error('Error submitting quiz:', error);
      setSubmissionStatus('error');
      if (!isAutoSubmit) {
        alert('Failed to submit quiz. Please try again.');
      }
    }
  }, [answers, questions, quizId, quizName, propTimeLimit, timeLeft, isSubmitted, navigate, isAnswerCorrect]);

  // DEFINE handleAutoSubmit
  const handleAutoSubmit = useCallback(() => {
    console.log('handleAutoSubmit called', {
      autoSubmitTriggered: autoSubmitTriggered.current,
      isSubmitted,
      timeLeft
    });

    if (autoSubmitTriggered.current || isSubmitted) {
      console.log('Auto-submit already triggered or quiz submitted');
      return;
    }

    autoSubmitTriggered.current = true;
    setIsTimeUp(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    setSubmissionStatus('submitting');

    alert('⏰ Time is up! Your quiz will be submitted automatically.');

    submitQuiz(true);
  }, [isSubmitted, submitQuiz]);

  // Timer effect
  useEffect(() => {
    if (isSubmitted || isTimeUp || !quizStartedAt || questions.length === 0 || isLoading) {
      return;
    }

    if (timerStartedRef.current) {
      return;
    }

    timerStartedRef.current = true;
    console.log('Starting timer ONCE with timeLeft:', timeLeft);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        if (prev <= 1) {
          console.log('!!! TIME REACHED ZERO - TRIGGERING AUTO-SUBMIT !!!');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
          }

          if (!autoSubmitTriggered.current && !isSubmitted) {
            handleAutoSubmit();
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);

    syncIntervalRef.current = setInterval(() => {
      if (!isSubmitted && !isTimeUp && quizStartedAt && timerRef.current) {
        const elapsed = Math.floor((Date.now() - quizStartedAt) / 1000);
        const remaining = Math.max(0, propTimeLimit - elapsed);

        axios.post('http://localhost:8088/api/quiz/sync-time', {
          quiz_id: quizId,
          elapsed_time: elapsed,
          remaining_time: remaining,
          timestamp: Date.now()
        }).catch(error => {
          console.error('Failed to sync timer:', error);
        });
      }
    }, 15000);

    return () => {
      console.log('Cleanup: clearing intervals');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [quizStartedAt]);

  // Backup trigger
  useEffect(() => {
    if (timeLeft <= 0 && !isSubmitted && !isTimeUp && !autoSubmitTriggered.current && quizStartedAt) {
      console.log('!!! BACKUP TRIGGER: timeLeft <= 0 !!!');

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      handleAutoSubmit();
    }
  }, [timeLeft, isSubmitted, isTimeUp, quizStartedAt, handleAutoSubmit]);

  // Auto-save answers
  useEffect(() => {
    if (quizStartedAt && !isSubmitted && !isTimeUp && questions.length > 0 && !isLoading) {
      const saveState = {
        answers,
        markedForReview,
        currentIndex,
        startedAt: quizStartedAt,
        isSubmitted: false,
      };
      localStorage.setItem(`enhanced_quiz_state_${quizId}`, JSON.stringify(saveState));
    }
  }, [answers, markedForReview, currentIndex, quizStartedAt, isSubmitted, isTimeUp, quizId, questions.length, isLoading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 60) return '#ef4444';
    if (timeLeft <= 180) return '#f59e0b';
    return '#10b981';
  };

  const handleAnswerSelect = (answer) => {
    console.log(`Selected answer for Q${currentIndex + 1}:`, answer);
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: answer,
    }));
    if (markedForReview[currentIndex]) {
      setMarkedForReview((prev) => ({
        ...prev,
        [currentIndex]: false,
      }));
    }
  };

  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
  };

  const getQuestionStatus = (index) => {
    if (answers[index]) return 'answered';
    if (markedForReview[index]) return 'marked';
    return 'unanswered';
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleManualTimeSync = async () => {
    if (!quizStartedAt) return;

    const elapsed = Math.floor((Date.now() - quizStartedAt) / 1000);
    const remaining = Math.max(0, propTimeLimit - elapsed);

    try {
      const response = await axios.post('http://localhost:8088/api/quiz/validate-time', {
        quiz_id: quizId,
        client_remaining: remaining,
        client_elapsed: elapsed,
        timestamp: Date.now()
      });

      if (!response.data.is_valid && response.data.server_remaining) {
        setTimeLeft(response.data.server_remaining);
        alert(`Time synced with server. Remaining: ${formatTime(response.data.server_remaining)}`);
      } else {
        alert('Time is in sync with server');
      }
    } catch (error) {
      console.error('Failed to sync time:', error);
      alert('Failed to sync time with server');
    }
  };

  const testAutoSubmit = () => {
    console.log('Manual test - setting timeLeft to 0');
    setTimeLeft(0);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading quiz...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorCard}>
          <p style={styles.errorText}>No questions found.</p>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div style={styles.submissionContainer}>
        <div style={styles.submissionCard}>
          {submissionStatus === 'submitting' && (
            <>
              <div style={styles.spinner}></div>
              <p style={styles.submissionText}>Submitting your quiz...</p>
            </>
          )}
          {submissionStatus === 'success' && (
            <>
              <div style={styles.successIcon}>✓</div>
              <p style={styles.successText}>Quiz submitted successfully!</p>
              <p style={styles.redirectText}>Redirecting to results...</p>
            </>
          )}
          {submissionStatus === 'error' && (
            <>
              <div style={styles.errorIcon}>✗</div>
              <p style={styles.errorText}>Submission failed</p>
              <button onClick={() => submitQuiz(false)} style={styles.retryButton}>
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(markedForReview).filter(v => v === true).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.timerBar}>
        <div style={styles.timerBarContent}>
          <div style={styles.leftSection}>
            <button onClick={() => setShowSidebar(!showSidebar)} style={styles.sidebarToggle}>
              {showSidebar ? '◀' : '▶'}
            </button>
            <div>
              <h2 style={styles.quizTitle}>Quiz: {quizName}</h2>
              <div style={styles.progressStats}>
                <span>📝 {answeredCount}/{questions.length} Answered</span>
                <span style={styles.markedBadge}>🏷️ {markedCount} Marked</span>
              </div>
            </div>
          </div>

          <div style={styles.timerSection}>
            <div style={styles.timerLabel}>Time Remaining</div>
            <div style={{ ...styles.timerValue, color: getTimerColor() }}>
              {formatTime(timeLeft)}
            </div>
            <button onClick={handleManualTimeSync} style={styles.syncButton} title="Sync with server">
              🔄
            </button>
            <button onClick={testAutoSubmit} style={{ ...styles.syncButton, background: '#ef4444', marginLeft: '5px' }} title="Test Auto-Submit">
              ⏰ Test
            </button>
          </div>

          <button onClick={() => {
            if (window.confirm(`Are you sure you want to submit the quiz?\n\nAnswered: ${answeredCount}/${questions.length}\nMarked for review: ${markedCount}`)) {
              submitQuiz(false);
            }
          }} style={styles.submitButton}>
            Submit Quiz
          </button>
        </div>

        <div style={styles.timerProgressBar}>
          <div style={{ ...styles.timerProgressFill, width: `${(timeLeft / propTimeLimit) * 100}%`, backgroundColor: getTimerColor() }} />
        </div>
      </div>

      <div style={{ ...styles.mainContainer, marginLeft: showSidebar ? '320px' : '0' }}>
        {showSidebar && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>📋 Question Map</h3>
              <div style={styles.sidebarStats}>
                <div style={styles.statItem}>
                  <span style={styles.statDotAnswered}></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statDotMarked}></span>
                  <span>Marked ({markedCount})</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statDotUnanswered}></span>
                  <span>Unanswered ({questions.length - answeredCount})</span>
                </div>
              </div>
            </div>

            <div style={styles.questionGrid}>
              {questions.map((_, idx) => {
                const status = getQuestionStatus(idx);
                let buttonStyle = { ...styles.questionGridButton };
                if (status === 'answered') buttonStyle = { ...buttonStyle, ...styles.questionGridButtonAnswered };
                if (status === 'marked') buttonStyle = { ...buttonStyle, ...styles.questionGridButtonMarked };
                if (currentIndex === idx) buttonStyle = { ...buttonStyle, ...styles.questionGridButtonCurrent };

                let statusIcon = '';
                if (status === 'answered') statusIcon = '✓';
                if (status === 'marked') statusIcon = '🏷️';

                return (
                  <button
                    key={idx}
                    onClick={() => jumpToQuestion(idx)}
                    style={buttonStyle}
                    title={`Question ${idx + 1}: ${status}`}
                  >
                    {idx + 1}
                    {statusIcon && <span style={styles.questionStatusIcon}>{statusIcon}</span>}
                  </button>
                );
              })}
            </div>

            <div style={styles.sidebarFooter}>
              <button onClick={() => jumpToQuestion(0)} style={styles.sidebarNavButton}>
                ⏮ First
              </button>
              <button onClick={() => jumpToQuestion(questions.length - 1)} style={styles.sidebarNavButton}>
                Last ⏭
              </button>
            </div>
          </div>
        )}

        <div style={styles.questionArea}>
          <div style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <div style={styles.questionNumber}>
                Question {currentIndex + 1} of {questions.length}
              </div>
              <button
                onClick={toggleMarkForReview}
                style={{
                  ...styles.markButton,
                  backgroundColor: markedForReview[currentIndex] ? '#f59e0b' : '#334155',
                }}
              >
                {markedForReview[currentIndex] ? '★ Marked for Review' : '☆ Mark for Review'}
              </button>
            </div>

            <div style={styles.questionText}>
              <h3>{currentQuestion.id || currentIndex + 1}. {currentQuestion.question}</h3>
            </div>

            <div style={styles.optionsContainer}>
              {currentQuestion.options && currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentIndex] === option;
                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <div
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    style={{
                      ...styles.optionItem,
                      ...(isSelected ? styles.optionItemSelected : {}),
                    }}
                  >
                    <div style={styles.optionLetter}>{optionLetter}</div>
                    <div style={styles.optionText}>{option}</div>
                    {isSelected && <div style={styles.selectedCheck}>✓</div>}
                  </div>
                );
              })}
            </div>

            <div style={styles.navigationButtons}>
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                style={{
                  ...styles.navButton,
                  ...styles.navButtonPrev,
                  opacity: currentIndex === 0 ? 0.5 : 1,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>

              <div style={styles.navigationInfo}>
                {answers[currentIndex] ? '✓ Answered' : '◯ Not Answered'}
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex === questions.length - 1}
                style={{
                  ...styles.navButton,
                  ...styles.navButtonNext,
                  opacity: currentIndex === questions.length - 1 ? 0.5 : 1,
                  cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          </div>

          <div style={styles.progressOverview}>
            <div style={styles.progressBarContainer}>
              <div style={{ ...styles.progressBarFill, width: `${progressPercentage}%` }} />
            </div>
            <div style={styles.progressText}>
              Overall Progress: {answeredCount} of {questions.length} questions answered ({Math.round(progressPercentage)}%)
            </div>
          </div>
        </div>
      </div>

      {timeLeft <= 60 && timeLeft > 0 && !autoSubmitTriggered.current && (
        <div style={styles.warningModal} className="warning-modal">
          <div style={styles.warningContent}>
            <div style={styles.warningIcon}>⚠️</div>
            <h3 style={styles.warningTitle}>Time is running out!</h3>
            <p style={styles.warningText}>
              You have {Math.ceil(timeLeft / 60)} minute{Math.ceil(timeLeft / 60) !== 1 ? 's' : ''} remaining.
              The quiz will auto-submit when time reaches 00:00.
            </p>
            <button onClick={() => {
              const modal = document.querySelector('.warning-modal');
              if (modal) modal.style.display = 'none';
            }} style={styles.warningButton}>
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  timerBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    zIndex: 20,
  },
  timerBarContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sidebarToggle: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
  },
  quizTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  progressStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  markedBadge: {
    color: '#f59e0b',
  },
  timerSection: {
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timerLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  timerValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  syncButton: {
    background: '#334155',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  timerProgressBar: {
    height: '4px',
    backgroundColor: '#334155',
  },
  timerProgressFill: {
    height: '100%',
    transition: 'width 1s linear',
  },
  mainContainer: {
    paddingTop: '100px',
    transition: 'margin-left 0.3s ease',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: '100px',
    bottom: 0,
    width: '320px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #334155',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  sidebarStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statDotAnswered: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  statDotMarked: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
  },
  statDotUnanswered: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#475569',
  },
  questionGrid: {
    padding: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
  },
  questionGridButton: {
    position: 'relative',
    aspectRatio: '1',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  questionGridButtonAnswered: {
    backgroundColor: '#10b981',
  },
  questionGridButtonMarked: {
    backgroundColor: '#f59e0b',
  },
  questionGridButtonCurrent: {
    outline: '2px solid #3b82f6',
    transform: 'scale(1.05)',
  },
  questionStatusIcon: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    fontSize: '10px',
  },
  sidebarFooter: {
    marginTop: 'auto',
    padding: '20px',
    borderTop: '1px solid #334155',
    display: 'flex',
    gap: '10px',
  },
  sidebarNavButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
  },
  questionArea: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 24px 40px',
  },
  questionCard: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #334155',
  },
  questionNumber: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  markButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  questionText: {
    marginBottom: '32px',
    fontSize: '20px',
    lineHeight: '1.5',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  optionItemSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optionLetter: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: '8px',
    fontWeight: 'bold',
    marginRight: '16px',
  },
  optionText: {
    flex: 1,
    fontSize: '16px',
  },
  selectedCheck: {
    color: '#10b981',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  navButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  navButtonPrev: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  navButtonNext: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  navigationInfo: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  progressOverview: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
  },
  progressBarContainer: {
    height: '8px',
    backgroundColor: '#334155',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  warningModal: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease',
  },
  warningContent: {
    backgroundColor: '#f59e0b',
    padding: '20px',
    borderRadius: '12px',
    maxWidth: '300px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  warningIcon: {
    fontSize: '32px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  warningTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
    color: '#0f172a',
  },
  warningText: {
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
    color: '#0f172a',
  },
  warningButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f1f5f9',
  },
  errorCard: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '18px',
    marginBottom: '20px',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid #334155',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '18px',
  },
  submissionContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submissionCard: {
    backgroundColor: '#1e293b',
    padding: '40px',
    borderRadius: '16px',
    textAlign: 'center',
    minWidth: '300px',
  },
  submissionText: {
    marginTop: '16px',
    fontSize: '18px',
  },
  successIcon: {
    fontSize: '64px',
    color: '#10b981',
  },
  successText: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginTop: '16px',
    color: '#10b981',
  },
  redirectText: {
    marginTop: '8px',
    color: '#94a3b8',
  },
  errorIcon: {
    fontSize: '64px',
    color: '#ef4444',
  },
  retryButton: {
    marginTop: '20px',
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
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

export default EnhancedQuizRunner;