import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Editor() {
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState('normal'); // 'normal' or 'shuffle'
  const [timeLimitStr, setTimeLimitStr] = useState('300'); // '0' means no timer, '300' is 5 minutes
  const location = useLocation();

  // Load latest draft or text from Home navigation
  useEffect(() => {
    if (location.state && location.state.text) {
      setRawText(location.state.text);
      // Optional: clear location state if we don't want it permanently loading this on refresh
    } else {
      axios.get('http://localhost:8088/api/drafts/latest').then(res => {
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
      const res = await axios.post('http://localhost:8088/api/parse-quiz', { text: rawText });
      setParsedData(res.data.questions || []);
    } catch (err) {
      console.error("Error parsing", err);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post('http://localhost:8088/api/drafts', {
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
      const res = await axios.post('http://localhost:8088/api/drafts', {
        id: draftId,
        raw_text: rawText,
        parsed_data: parsedData
      });
      setDraftId(res.data.id);
      
      const tl = parseInt(timeLimitStr, 10);
      const isShuffle = setupMode === 'shuffle';
      
      // We pass the settings to `/enhanced-quiz`, keeping the logic compatible
      navigate('/enhanced-quiz', {
        state: {
          quizData: {
            name: "Quiz Draft",
            questions: isShuffle ? [...parsedData].sort(() => Math.random() - 0.5) : parsedData
          },
          timeLimit: tl > 0 ? tl : 999999 // If no timer, arbitrarily large or handled by enhanced-quiz logic properly
        }
      });
    } catch (err) {
      console.error("Error saving draft before quiz", err);
      alert("Failed to initialize quiz. Please try again.");
    }
    setIsSaving(false);
  };

  const handleSetupSave = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post('http://localhost:8088/api/drafts', {
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
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', padding: '20px', gap: '20px' }}>
      {/* Left Pane: Raw Text */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Raw Text Input</h2>
          <button onClick={() => setShowHelp(true)} style={{ padding: '6px 12px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            ❓ Help
          </button>
        </div>
        <textarea
          style={{ flex: 1, padding: '10px', fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste your quiz text here (e.g. 1. Question... A) Option... Answer: A)"
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleParse} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Generate Preview</button>
          <button onClick={handleSaveDraft} disabled={isSaving} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* Right Pane: Live Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Live Preview</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleOpenSetup('normal')} 
              disabled={!parsedData.length || isSaving} 
              style={{ padding: '10px 20px', background: parsedData.length ? '#28a745' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: parsedData.length ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              Take Normal Quiz
            </button>
            <button
              onClick={() => handleOpenSetup('shuffle')}
              disabled={!parsedData.length || isSaving}
              style={{
                padding: '10px 20px',
                background: parsedData.length && !isSaving ? '#8b5cf6' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: parsedData.length && !isSaving ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              Shuffle & Take Quiz
            </button>
          </div>
        </div>

        {parsedData.length === 0 ? (
          <p style={{ color: '#666' }}>No questions parsed yet. Enter text and click Generate Preview.</p>
        ) : (
          parsedData.map((q, i) => (
            <div key={i} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', background: '#f9f9f9' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>{q.id}. {q.question}</div>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {q.options.map((opt, j) => (
                  <li key={j} style={{ padding: '5px 0', whiteSpace: 'pre-wrap' }}>- {opt}</li>
                ))}
              </ul>
              {q.answer && <div style={{ color: 'green', marginTop: '10px', fontWeight: 'bold' }}>Answer: {q.answer}</div>}
            </div>
          ))
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '600px', width: '100%',
            maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>How the Parser Engine Works</h2>
            
            <div style={{ lineHeight: '1.6', color: '#444' }}>
              <p>The parser engine uses specific formatting rules to extract questions, options, and answers from text:</p>
              
              <h4 style={{ marginBottom: '5px' }}>1. Question Formats</h4>
              <p style={{ margin: '0 0 10px 0' }}>Questions must start with a number followed by a dot, parenthesis, or slash. Examples: <code>1.</code>, <code>Question 1)</code>, <code>Câu 1/</code></p>
              
              <h4 style={{ marginBottom: '5px' }}>2. Option Formats</h4>
              <p style={{ margin: '0 0 10px 0' }}>Options must start with a letter (A-G) followed by a dot or parenthesis. Examples: <code>A)</code>, <code>b.</code></p>
              
              <h4 style={{ marginBottom: '5px' }}>3. Inline Answers</h4>
              <p style={{ margin: '0 0 10px 0' }}>You can specify the answer to a question using keywords like Answer, Ans, or Correct followed by the letter. Example: <code>Answer: A</code></p>
              
              <h4 style={{ marginBottom: '5px' }}>4. Answer Key (End of Document)</h4>
              <p style={{ margin: '0 0 10px 0' }}>You can provide an answer key section at the bottom of your text. It must be preceded by <code>Answers:</code>, <code>Key:</code>, or <code>Đáp án:</code>. Example: <br/><code>Answers:</code><br/><code>1. A 2. B 3. C</code></p>

              <h4 style={{ marginBottom: '5px' }}>5. Splitting Elements</h4>
              <p style={{ margin: '0 0 10px 0' }}>
                Text is attached sequentially to whatever block is currently active (a question text or an option). 
                <strong> To break the block and stop appending text, press ENTER twice so that there is a blank line.</strong> Any unrecognized text after options without a blank line will still be attached, whereas text separated by a blank line will be safely discarded.
              </p>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                onClick={() => setShowHelp(false)} 
                style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Setup Modal */}
      {showSetup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>Quiz Setup</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Mode: <strong>{setupMode === 'normal' ? 'Normal (Ordered)' : 'Shuffle Questions'}</strong>
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#444' }}>Select Time Limit:</label>
              <select 
                value={timeLimitStr}
                onChange={(e) => setTimeLimitStr(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
              >
                <option value="0">No Timer (Unlimited)</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
                <option value="900">15 Minutes</option>
                <option value="1800">30 Minutes</option>
                <option value="3600">60 Minutes</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleSetupStart} 
                disabled={isSaving}
                style={{ padding: '12px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isSaving ? 'Starting...' : 'Start Selection'}
              </button>
              <button 
                onClick={handleSetupSave} 
                disabled={isSaving}
                style={{ padding: '12px 16px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isSaving ? 'Saving...' : 'Save to Drafts & Take Later'}
              </button>
              <button 
                onClick={() => setShowSetup(false)} 
                disabled={isSaving}
                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
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
