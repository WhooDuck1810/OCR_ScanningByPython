import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

function Home() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, scanning, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.docx'))) {
      setFile(selectedFile);
      setStatus('idle');
    } else {
      alert('Please upload a PDF or DOCX file.');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setExtractedText('');
    setStatus('idle');
    setIsScanning(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setIsScanning(true);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = `${API_BASE_URL}/api/upload`;

    try {
      setErrorMsg('');
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error((errData && errData.detail) || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setExtractedText(data.content);
      setStatus('success');
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg(error.message || 'Something went wrong.');
      setStatus('error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!extractedText) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: extractedText }),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      // Navigate to /quiz with state
      navigate('/quiz', { state: { questions: data.questions } });

    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Failed to generate quiz. Check backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            QuizAuto
          </h1>
          <p className="text-slate-400 text-lg">
            Transform your PDF documents into interactive quizzes instantly.
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Upload className="text-blue-400" /> Upload Document
            </h2>

            {!file ? (
              <div className="group relative border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-8 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-500 group-hover:text-blue-400 mx-auto mb-4 transition-colors" />
                  <p className="text-slate-300 font-medium">Click to browse or drag & drop</p>
                  <p className="text-slate-500 text-sm mt-2">PDF and DOCX files accepted</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="truncate text-slate-300 font-medium max-w-[200px]" title={file.name}>
                    {file.name}
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-slate-400 hover:text-rose-400 transition-colors p-2 rounded-full hover:bg-slate-600/50"
                    title="Remove file"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleUpload()}
                    disabled={isScanning}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isScanning ? <Loader2 className="animate-spin" /> : 'Start Scan (PyMuPDF)'}
                  </button>
                </div>
              </div>
            )}

            {/* Status Messages */}
            <div className="mt-6">
              {status === 'scanning' && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 className="animate-spin" /> Extracting content...
                </div>
              )}
              {status === 'success' && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle /> Extracted successfully!
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-rose-400 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 text-sm font-medium">
                  <AlertCircle /> <span>{errorMsg || 'Something went wrong.'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result Section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 backdrop-blur-sm min-h-[400px] flex flex-col">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <FileText className="text-emerald-400" /> Extracted Text
            </h2>
            <div className="flex-grow bg-slate-900/50 border border-slate-700 rounded-xl p-4 overflow-auto max-h-[500px] text-slate-400 font-mono text-sm mb-4">
              {extractedText !== '' && extractedText !== undefined && extractedText !== null ? (
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  className="w-full h-full min-h-[300px] bg-transparent text-slate-300 font-mono text-sm resize-none outline-none border-none focus:ring-0 p-0 m-0"
                  placeholder="Edit your extracted text here..."
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                  No content extracted yet.
                </div>
              )}
            </div>

            {/* Actions for Extracted Text */}
            {extractedText && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button
                  onClick={() => navigate('/editor', { state: { text: extractedText } })}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/20"
                >
                  Open in Editor
                </button>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={isGenerating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      Generate Basic Quiz <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
