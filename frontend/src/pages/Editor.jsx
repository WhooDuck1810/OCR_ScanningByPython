import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Editor() {
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Load latest draft on mount
  useEffect(() => {
    axios.get('http://localhost:8088/api/drafts/latest').then(res => {
      if (res.data && res.data.id) {
        setDraftId(res.data.id);
        setRawText(res.data.raw_text || '');
        setParsedData(res.data.parsed_data || []);
      }
    }).catch(err => console.error("Error loading draft", err));
  }, []);

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

  const handleStartQuiz = () => {
    // In a real app we'd save this draft as a final Quiz and navigate to it
    navigate('/runner/draft');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', padding: '20px', gap: '20px' }}>
      {/* Left Pane: Raw Text */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2>Raw Text Input</h2>
        <textarea
          style={{ flex: 1, padding: '10px', fontSize: '14px', fontFamily: 'monospace' }}
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
          <button onClick={handleStartQuiz} disabled={!parsedData.length} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Take Quiz</button>
        </div>
        
        {parsedData.length === 0 ? (
          <p style={{ color: '#666' }}>No questions parsed yet. Enter text and click Generate Preview.</p>
        ) : (
          parsedData.map((q, i) => (
            <div key={i} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', background: '#f9f9f9' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{q.id}. {q.question}</div>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {q.options.map((opt, j) => (
                  <li key={j} style={{ padding: '5px 0' }}>- {opt}</li>
                ))}
              </ul>
              {q.answer && <div style={{ color: 'green', marginTop: '10px', fontWeight: 'bold' }}>Answer: {q.answer}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
