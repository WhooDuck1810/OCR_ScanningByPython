import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const questions = location.state?.questions || [];

  // State to track selected answers: { questionId: selectedOption }
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No questions found.</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  const handleOptionSelect = (questionId, option) => {
    if (showResults) return; // Prevent changing answers after submission
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.answer) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> Back to Upload
        </button>

        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              Start Quiz
            </h1>
            <p className="text-slate-400">
              Test your knowledge based on the document.
            </p>
          </div>
          {showResults && (
            <div className="text-right">
              <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Your Score</p>
              <p className="text-4xl font-bold text-white">{calculateScore()} <span className="text-xl text-slate-500">/ {questions.length}</span></p>
            </div>
          )}
        </header>

        <div className="space-y-8">
          {questions.map((q, index) => {
            const isCorrect = answers[q.id] === q.answer;
            const isSelected = answers[q.id];

            return (
              <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm">
                <h3 className="text-xl font-semibold mb-6 flex gap-3">
                  <span className="text-slate-500 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                  {q.question}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((option) => {
                    let optionClass = "p-4 rounded-xl border-2 text-left font-medium transition-all relative overflow-hidden ";

                    if (showResults) {
                      if (option === q.answer) {
                        optionClass += "border-emerald-500 bg-emerald-500/10 text-emerald-400";
                      } else if (answers[q.id] === option) {
                        optionClass += "border-rose-500 bg-rose-500/10 text-rose-400";
                      } else {
                        optionClass += "border-slate-700 bg-slate-800/50 text-slate-500 opacity-50";
                      }
                    } else {
                      if (answers[q.id] === option) {
                        optionClass += "border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
                      } else {
                        optionClass += "border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300";
                      }
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleOptionSelect(q.id, option)}
                        className={optionClass}
                        disabled={showResults}
                      >
                        <div className="relative z-10 flex items-center justify-between">
                          {option}
                          {showResults && option === q.answer && <CheckCircle2 size={18} />}
                          {showResults && answers[q.id] === option && option !== q.answer && <XCircle size={18} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!showResults && (
          <div className="mt-12 text-center">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== questions.length}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-12 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Submit Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizPage;
