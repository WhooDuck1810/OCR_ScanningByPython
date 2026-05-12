import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import QuizPage from './pages/QuizPage';
import Editor from './pages/Editor';
import Runner from './pages/Runner';
import Dashboard from './pages/Dashboard';
import EnhancedQuizRunner from './pages/EnhancedQuizRunner';
import EnhancedResults from './pages/EnhancedResults';
import CreatorAnalytics from './pages/CreatorAnalytics';
import TakeQuiz from './pages/TakeQuiz';
import Login from './pages/Login';

function ProtectedRoute({ children, creatorsOnly = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (creatorsOnly && user?.role !== 'creator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppNav() {
  const { isAuthenticated, user, logout } = useAuth();

  const navLinkStyle = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center font-bold text-white text-xl">Q</div>
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">QuizAuto</span>
      </div>
      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <NavLink to="/" className={navLinkStyle}>Home</NavLink>
            {user?.role === 'creator' && (
              <>
                <NavLink to="/editor" className={navLinkStyle}>Editor</NavLink>
                <NavLink to="/analytics" className={navLinkStyle}>Analytics</NavLink>
              </>
            )}
            <NavLink to="/dashboard" className={navLinkStyle}>Dashboard</NavLink>
            <div className="ml-4 flex items-center gap-3 border-l border-slate-700 pl-4">
              <span className="text-sm text-slate-400">
                <span className="font-bold text-slate-200">{user?.username}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  user?.role === 'creator'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {user?.role === 'creator' ? 'Creator' : 'Quiz Taker'}
                </span>
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <NavLink to="/login" className={navLinkStyle}>Sign In</NavLink>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppNav />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/editor" element={<ProtectedRoute creatorsOnly><Editor /></ProtectedRoute>} />
          <Route path="/runner/:quizId?" element={<ProtectedRoute><Runner /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute creatorsOnly><CreatorAnalytics /></ProtectedRoute>} />

          {/* Public routes - accessible via invite links without auth */}
          <Route path="/take/:quizId" element={<TakeQuiz />} />
          <Route path="/enhanced-quiz/:quizId?" element={<EnhancedQuizRunner />} />
          <Route path="/enhanced-results/:quizId?" element={<EnhancedResults />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
