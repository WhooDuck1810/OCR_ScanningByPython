import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import QuizPage from './pages/QuizPage';
import Editor from './pages/Editor';
import Runner from './pages/Runner';
import Dashboard from './pages/Dashboard';
import EnhancedQuizRunner from './pages/EnhancedQuizRunner';
import EnhancedResults from './pages/EnhancedResults';

function App() {
  const navLinkStyle = ({ isActive }) => 
    `px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
      isActive 
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" 
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <BrowserRouter>
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center font-bold text-white text-xl">Q</div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">QuizAuto</span>
        </div>
        <div className="flex gap-2">
          <NavLink to="/" className={navLinkStyle}>Home</NavLink>
          <NavLink to="/editor" className={navLinkStyle}>Editor</NavLink>
          <NavLink to="/dashboard" className={navLinkStyle}>Dashboard</NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/runner/:quizId?" element={<Runner />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/enhanced-quiz/:quizId?" element={<EnhancedQuizRunner />} />
        <Route path="/enhanced-results/:quizId?" element={<EnhancedResults />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
