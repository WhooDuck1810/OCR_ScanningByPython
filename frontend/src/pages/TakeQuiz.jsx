import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function TakeQuiz() {
  const { quizId } = useParams();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();

  const [quizInfo, setQuizInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timeLimitStr, setTimeLimitStr] = useState('300');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);

  useEffect(() => {
    const fetchQuizInfo = async () => {
      try {
        const url = inviteToken
          ? `${API_BASE_URL}/api/quizzes/${quizId}?invite_token=${encodeURIComponent(inviteToken)}`
          : `${API_BASE_URL}/api/quizzes/${quizId}`;
        const res = await axios.get(url);
        setQuizInfo({
          id: res.data.id,
          name: res.data.name,
          questionCount: res.data.questions?.length || 0,
          createdAt: res.data.created_at,
        });
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Quiz not found. The link may be invalid or the quiz may have been removed.');
        } else if (err.response?.status === 403) {
          setError('Access denied. You need a valid invite link to access this quiz.');
        } else {
          setError('Failed to load quiz. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuizInfo();
  }, [quizId, inviteToken]);

  const handleStart = () => {
    const tl = parseInt(timeLimitStr, 10);
    navigate(`/enhanced-quiz/${quizId}`, {
      state: {
        timeLimit: tl > 0 ? tl : 999999,
        isShuffle: shuffleQuestions,
        isShuffleAnswers: shuffleAnswers,
        inviteToken,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-xl">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-white mb-3">Oops!</h2>
          <p className="text-slate-400 mb-8">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Quiz Info Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 shadow-xl backdrop-blur-sm mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
              Q
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">
                {quizInfo.name || 'Untitled Quiz'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {quizInfo.questionCount} question{quizInfo.questionCount !== 1 ? 's' : ''}
                {quizInfo.createdAt && (
                  <span> &middot; Created {new Date(quizInfo.createdAt).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              You've been invited to take this quiz. Configure your preferences below and press <strong className="text-white">Start</strong> when ready.
            </p>
          </div>

          {/* Time Limit */}
          <div className="mb-5">
            <label className="block mb-2 font-bold text-slate-300 text-sm">Time Limit</label>
            <select
              value={timeLimitStr}
              onChange={(e) => setTimeLimitStr(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem top 50%',
                backgroundSize: '0.65rem auto',
              }}
            >
              <option value="0">No Timer (Unlimited)</option>
              <option value="300">5 Minutes</option>
              <option value="600">10 Minutes</option>
              <option value="900">15 Minutes</option>
              <option value="1800">30 Minutes</option>
              <option value="3600">60 Minutes</option>
            </select>
          </div>

          {/* Shuffle Options */}
          <div className="space-y-3 mb-8">
            <label
              onClick={() => setShuffleQuestions(!shuffleQuestions)}
              className="flex items-center gap-3 cursor-pointer select-none p-3 bg-slate-900/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${shuffleQuestions ? 'bg-purple-500 border-purple-500' : 'border-slate-500 bg-transparent'}`}>
                {shuffleQuestions && <span className="text-white text-xs font-bold">&#10003;</span>}
              </div>
              <div>
                <span className="font-bold text-slate-200 text-sm">Shuffle Questions</span>
                <p className="text-xs text-slate-400 m-0 mt-0.5">Randomize question order</p>
              </div>
            </label>

            <label
              onClick={() => setShuffleAnswers(!shuffleAnswers)}
              className="flex items-center gap-3 cursor-pointer select-none p-3 bg-slate-900/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${shuffleAnswers ? 'bg-amber-500 border-amber-500' : 'border-slate-500 bg-transparent'}`}>
                {shuffleAnswers && <span className="text-white text-xs font-bold">&#10003;</span>}
              </div>
              <div>
                <span className="font-bold text-slate-200 text-sm">Shuffle Answer Choices</span>
                <p className="text-xs text-slate-400 m-0 mt-0.5">Randomize option order within each question</p>
              </div>
            </label>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-extrabold text-lg rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
          >
            Start Quiz
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs">
          Powered by <span className="font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">QuizAuto</span>
        </p>
      </div>
    </div>
  );
}
