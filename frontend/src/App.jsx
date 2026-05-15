import { useState, useEffect, useCallback } from 'react';

import Background from './components/Background';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import UploadSection from './components/UploadSection';
import OptionsSection from './components/OptionsSection';
import ProcessingSection from './components/ProcessingSection';
import ResultSection from './components/ResultSection';
import ErrorBanner from './components/ErrorBanner';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'; 
// export const API_URL = `https://quality-enhancer.onrender.com/api`;  

/**
 * App — State Machine
 * phase: 'idle' | 'options' | 'processing' | 'complete'
 */
export default function App() {
  // ── Theme ──────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // ── App State ──────────────────────────────────────────────────
  const [phase,     setPhase]     = useState('idle');    // idle | options | processing | complete
  const [jobId,     setJobId]     = useState(null);
  const [fileType,  setFileType]  = useState(null);
  const [file,      setFile]      = useState(null);
  const [fileName,  setFileName]  = useState(null);  // original upload filename
  const [level,     setLevel]     = useState('medium');
  const [error,     setError]     = useState('');
  const [uploadKey, setUploadKey] = useState(0); // bump to remount UploadSection

  // ── Callbacks ──────────────────────────────────────────────────
  const handleUploaded = useCallback((result) => {
    if (!result) {
      // File removed
      setPhase('idle');
      setJobId(null);
      setFileType(null);
      setFile(null);
      return;
    }
    setJobId(result.jobId);
    setFileType(result.fileType);
    setFile(result.file);
    setFileName(result.fileName || null);
    setPhase('options');
    setError('');
  }, []);

  const handleEnhance = useCallback(async ({ level: lvl, addWatermark }) => {
    setLevel(lvl);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, fileType, level: lvl, addWatermark, originalName: fileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start enhancement.');
      setPhase('processing');
    } catch (e) {
      setError(e.message);
    }
  }, [jobId, fileType, fileName]);

  const handleComplete = useCallback(() => {
    setPhase('complete');
  }, []);

  const handleError = useCallback((msg) => {
    setError(msg);
    if (phase === 'processing') setPhase('options');
  }, [phase]);

  const handleNewFile = useCallback(() => {
    setPhase('idle');
    setJobId(null);
    setFileType(null);
    setFile(null);
    setFileName(null);
    setLevel('medium');
    setError('');
    setUploadKey((k) => k + 1); // remount UploadSection to clear its internal state
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Light mode body bg 
  const bodyBg = theme === 'dark'
    ? 'bg-gray-950 text-gray-100'
    : 'bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 text-slate-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 font-inter ${bodyBg}`}>
      <Background theme={theme} />
      <Navbar theme={theme} onToggleTheme={toggleTheme} />

      <Hero />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Upload — always visible */}
        <UploadSection key={uploadKey} onUploaded={handleUploaded} onError={setError} />

        {/* Options — after file uploaded */}
        {phase === 'options' && (
          <OptionsSection onEnhance={handleEnhance} />
        )}

        {/* Processing — SSE progress */}
        {phase === 'processing' && (
          <ProcessingSection
            jobId={jobId}
            fileType={fileType}
            level={level}
            onComplete={handleComplete}
            onError={handleError}
          />
        )}

        {/* Result — download + comparison */}
        {phase === 'complete' && (
          <ResultSection
            jobId={jobId}
            fileType={fileType}
            file={file}
            level={level}
            onNewFile={handleNewFile}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4" style={{ borderColor: 'var(--footer-border)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--footer-text)' }}>
            © {new Date().getFullYear()} <span className="font-semibold text-brand-400">QuickEnhance</span> — All processing is server-side. No data stored.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full border" style={{ color: 'var(--footer-text)', borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}>Node.js</span>
            <span className="text-xs px-2.5 py-1 rounded-full border" style={{ color: 'var(--footer-text)', borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}>Sharp</span>
            <span className="text-xs px-2.5 py-1 rounded-full border" style={{ color: 'var(--footer-text)', borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}>FFmpeg</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
