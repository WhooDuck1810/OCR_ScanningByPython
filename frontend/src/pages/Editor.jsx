import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function Editor() {
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState('normal'); // 'normal' or 'shuffle'
  const [timeLimitStr, setTimeLimitStr] = useState('300'); // '0' means no timer, '300' is 5 minutes
  const [questionLimitStr, setQuestionLimitStr] = useState('all'); // 'all', '10', '20', etc.
  const location = useLocation();
  const navigate = useNavigate();

  // Load latest draft or text from Home navigation
  useEffect(() => {
    if (location.state && location.state.text) {
      setRawText(location.state.text);
      // Optional: clear location state if we don't want it permanently loading this on refresh
    } else {
      axios.get(`${API_BASE_URL}/api/drafts/latest`).then(res => {
        if (res.data && res.data.id) {
          setDraftId(res.data.id);
          setRawText(res.data.raw_text || '');
          setParsedData(res.data.parsed_data || []);
        }
      }).catch(err => console.error("Error loading draft", err));
    }
  }, [location.state]);

  const handleParse = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/parse-quiz`, { text: rawText });
      setParsedData(res.data.questions || []);
    } catch (err) {
      console.error("Error parsing", err);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/drafts`, {
        id: draftId,
        raw_text: rawText,
        parsed_data: parsedData
      });
      setDraftId(res.data.id);
      alert("Draft saved!");
    } catch (err) {
      console.error("Error saving draft", err);
    }
    setIsSaving(false);
  };

  const handleOpenSetup = (mode) => {
    if (parsedData.length === 0) {
      alert("Please generate preview first");
      return;
    }
    setSetupMode(mode);
    setShowSetup(true);
  };

  const handleSetupStart = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/drafts`, {
        id: draftId,
        raw_text: rawText,
        parsed_data: parsedData
      });
      setDraftId(res.data.id);
      
      const tl = parseInt(timeLimitStr, 10);
      const isShuffle = setupMode === 'shuffle';
      
      let finalQuestions = [...parsedData];
      if (isShuffle) {
        finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
        if (questionLimitStr !== 'all') {
          finalQuestions = finalQuestions.slice(0, parseInt(questionLimitStr, 10));
        }
      }

      // We pass the settings to `/enhanced-quiz`, keeping the logic compatible
      navigate('/enhanced-quiz', {
        state: {
          quizData: {
            name: "Quiz Draft",
            questions: finalQuestions
          },
          timeLimit: tl > 0 ? tl : 999999, // If no timer, arbitrarily large or handled by enhanced-quiz logic properly
          isShuffle: isShuffle
        }
      });
    } catch (err) {
      console.error("Error saving draft before quiz", err);
      const errorMsg = err.response?.data?.detail || err.message || "Unknown error";
      alert(`Failed to initialize quiz: ${errorMsg}. You can still try taking it from the Dashboard.`);
    }
    setIsSaving(false);
  };

  const handleSetupSave = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/drafts`, {
        id: draftId,
        raw_text: rawText,
        parsed_data: parsedData
      });
      setDraftId(res.data.id);
      alert("Saved! You can take it later from your Dashboard.");
      navigate('/dashboard');
    } catch (err) {
      console.error("Error saving draft", err);
      alert("Failed to save draft. Please try again.");
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-900 text-slate-100 flex p-6 gap-6 font-sans">
      {/* Left Pane: Raw Text */}
      <div className="flex-1 flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent m-0 flex items-center gap-2">
            <span className="text-blue-400">📝</span> Raw Text Input
          </h2>
          <button 
            onClick={() => setShowHelp(true)} 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-emerald-500/30 font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm"
          >
            ❓ Help Guide
          </button>
        </div>
        
        <textarea
          className="flex-1 p-4 text-sm font-mono whitespace-pre-wrap bg-slate-900/80 text-slate-300 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none resize-none transition-all"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your quiz text here (e.g. 1. Question... A) Option... Answer: A)"
        />
        
        <div className="flex gap-4">
          <button 
            onClick={handleParse} 
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
          >
            Generate Preview
          </button>
          <button 
            onClick={handleSaveDraft} 
            disabled={isSaving} 
            className={`flex-1 py-3 px-6 ${isSaving ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'} text-white font-bold border border-slate-600 rounded-xl transition-all`}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div className="flex-1 flex flex-col gap-4 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm shadow-xl max-h-[calc(100vh-121px)]">
        <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
          <h2 className="text-xl font-bold text-slate-200 m-0 flex items-center gap-2">
            <span className="text-emerald-400">✨</span> Live Preview
          </h2>
          <div className="flex gap-3">
            <button 
              onClick={() => handleOpenSetup('normal')} 
              disabled={!parsedData.length || isSaving} 
              className={`px-5 py-2 font-bold rounded-lg transition-all ${parsedData.length ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
            >
              Take Normal Quiz
            </button>
            <button
              onClick={() => handleOpenSetup('shuffle')}
              disabled={!parsedData.length || isSaving}
              className={`px-5 py-2 font-bold rounded-lg transition-all ${parsedData.length && !isSaving ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
            >
              Shuffle & Take
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
          {parsedData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic p-8 text-center border-2 border-dashed border-slate-700 rounded-xl">
              <span className="text-4xl mb-3">👀</span>
              No questions parsed yet.<br/>Enter text on the left and click "Generate Preview" to see your quiz take shape.
            </div>
          ) : (
            parsedData.map((q, i) => (
              <div key={i} className="border border-slate-700/50 p-5 rounded-xl bg-slate-900/60 shadow-sm hover:border-slate-600 transition-colors">
                <div className="font-bold mb-3 whitespace-pre-wrap text-blue-100 text-lg">
                  <span className="text-blue-400 mr-2">{q.id}.</span>{q.question}
                </div>
                <ul className="list-none p-0 m-0 space-y-2">
                  {q.options.map((opt, j) => (
                    <li key={j} className="py-2 px-3 bg-slate-800/80 rounded-lg text-slate-300 border border-slate-700/50 whitespace-pre-wrap flex items-start gap-2">
                      <span className="text-slate-500 font-bold mt-0.5">•</span>
                      <span>{opt}</span>
                    </li>
                  ))}
                </ul>
                {q.answer && (
                  <div className="mt-4 px-4 py-2 bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold flex items-center gap-2 inline-block">
                    <span>✓</span> Answer: {q.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <h2 className="mt-0 text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-6 border-b border-slate-700 pb-4">
              How the Parser Engine Works
            </h2>
            
            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p className="text-lg">The parser engine uses specific formatting rules to automatically extract questions, options, and answers from unstructured text:</p>
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><span className="bg-blue-500/20 px-2 py-0.5 rounded text-sm">1</span> Question Formats</h4>
                <p className="m-0 text-sm">Questions must start with a number followed by a dot, parenthesis, or slash. <br/><span className="text-slate-400">Examples:</span> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">1.</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">Question 1)</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">Câu 1/</code></p>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-bold text-purple-400 mb-2 flex items-center gap-2"><span className="bg-purple-500/20 px-2 py-0.5 rounded text-sm">2</span> Option Formats</h4>
                <p className="m-0 text-sm">Options must start with a letter (A-G) followed by a dot or parenthesis. <br/><span className="text-slate-400">Examples:</span> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">A)</code>, <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">b.</code></p>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><span className="bg-emerald-500/20 px-2 py-0.5 rounded text-sm">3</span> Inline Answers</h4>
                <p className="m-0 text-sm">You can specify the answer inline using keywords like Answer, Ans, or Correct followed by the letter. <br/><span className="text-slate-400">Example:</span> <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">Answer: A</code></p>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2"><span className="bg-amber-500/20 px-2 py-0.5 rounded text-sm">4</span> Answer Key (End of Document)</h4>
                <p className="m-0 text-sm">You can provide a bulk answer key section at the bottom. It must be preceded by <strong>Answers:</strong>, <strong>Key:</strong>, or <strong>Đáp án:</strong>.<br/><span className="text-slate-400">Example:</span><br/><code className="bg-slate-800 px-2 py-1 rounded text-emerald-400 block mt-2">Answers:<br/>1. A  2. B  3. C</code></p>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-2"><span className="bg-rose-500/20 px-2 py-0.5 rounded text-sm">5</span> Splitting Elements</h4>
                <p className="m-0 text-sm">
                  Text is attached sequentially to whatever block is active. 
                  <strong className="text-white block mt-2 mb-1 border-l-2 border-rose-500 pl-2">To hard-break and stop appending, press ENTER twice (leave a blank line).</strong> 
                  Text separated by a blank line will be safely discarded if it's not a new question.
                </p>
              </div>
            </div>

            <div className="mt-8 text-right border-t border-slate-700 pt-4">
              <button 
                onClick={() => setShowHelp(false)} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
              >
                Got it, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[1100] p-4">
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-xl">⚙️</div>
              <h2 className="text-2xl font-bold text-white m-0">Quiz Setup</h2>
            </div>
            
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
              <p className="text-slate-400 m-0 flex justify-between items-center">
                <span>Selected Mode:</span>
                <strong className={`px-3 py-1 rounded-lg text-sm ${setupMode === 'normal' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                  {setupMode === 'normal' ? '📝 Normal (Ordered)' : '🔀 Shuffle Questions'}
                </strong>
              </p>
            </div>
            
            {setupMode === 'shuffle' && (
              <div className="mb-4">
                <label className="block mb-3 font-bold text-slate-300">Question Limit:</label>
                <select 
                  value={questionLimitStr}
                  onChange={(e) => setQuestionLimitStr(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                >
                  <option value="all">Take All Questions ({parsedData.length})</option>
                  {[5, 10, 15, 20, 25, 30, 40, 50].filter(n => n < parsedData.length).map(n => (
                    <option key={n} value={n.toString()}>{n} Questions</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-8">
              <label className="block mb-3 font-bold text-slate-300">Set Time Limit:</label>
              <select 
                value={timeLimitStr}
                onChange={(e) => setTimeLimitStr(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                <option value="0">No Timer (Unlimited)</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1800">30 Minutes</option>
                <option value="3600">60 Minutes</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSetupStart} 
                disabled={isSaving}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex justify-center items-center shadow-lg hover:shadow-blue-500/20"
              >
                {isSaving ? 'Starting...' : '🚀 Start Quiz Now'}
              </button>
              <button 
                onClick={handleSetupSave} 
                disabled={isSaving}
                className="py-3 px-4 bg-slate-700 border border-slate-600 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex justify-center items-center"
              >
                {isSaving ? 'Saving...' : '💾 Save Draft & Exit'}
              </button>
              <button 
                onClick={() => setShowSetup(false)} 
                disabled={isSaving}
                className="py-2 mt-2 text-slate-400 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
