import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import QuizPage from './pages/QuizPage';
import Editor from './pages/Editor';
import Runner from './pages/Runner';
import Dashboard from './pages/Dashboard';
import EnhancedQuizRunner from './pages/EnhancedQuizRunner';
import EnhancedResults from './pages/EnhancedResults';
function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '1rem', background: '#f0f0f0', display: 'flex', gap: '1rem' }}>
        <Link to="/">Home</Link>
        <Link to="/editor">Editor</Link>
        <Link to="/dashboard">Dashboard</Link>
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
