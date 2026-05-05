import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('creator');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, role);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Something went wrong';
      setError(msg);
    }
    setSubmitting(false);
  };

  const tabClass = (t) =>
    `flex-1 py-3 text-center font-bold text-sm tracking-wide transition-all cursor-pointer ${
      tab === t
        ? 'text-white border-b-2 border-blue-500 bg-slate-800/50'
        : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
    }`;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center font-bold text-white text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
            Q
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            QuizAuto
          </h1>
          <p className="text-slate-400 mt-2">Sign in to manage your quizzes</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            <button onClick={() => { setTab('login'); setError(''); }} className={tabClass('login')}>
              Sign In
            </button>
            <button onClick={() => { setTab('register'); setError(''); }} className={tabClass('register')}>
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter your password"
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">I want to</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('creator')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      role === 'creator'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div className={`text-lg mb-1 ${role === 'creator' ? 'text-blue-400' : 'text-slate-400'}`}>
                      Create Quizzes
                    </div>
                    <div className="text-xs text-slate-500">Upload, edit, share</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('quiz_taker')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      role === 'quiz_taker'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                    }`}
                  >
                    <div className={`text-lg mb-1 ${role === 'quiz_taker' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      Take Quizzes
                    </div>
                    <div className="text-xs text-slate-500">Join via invite links</div>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
