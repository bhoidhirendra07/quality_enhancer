import { useState, useEffect, useRef } from 'react';
import ComparisonSlider from './ComparisonSlider';
import VideoComparisonSlider from './VideoComparisonSlider';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const EXPIRE_SECONDS = 10 * 60; // 10 minutes

export default function ResultSection({ jobId, fileType, file, level, onNewFile }) {
  const downloadUrl = `${API_BASE}/api/enhance/download/${jobId}`;

  // Stable beforeSrc: create object URL once, revoke on unmount
  const beforeSrcRef = useRef('');
  if (file && !beforeSrcRef.current) {
    beforeSrcRef.current = URL.createObjectURL(file);
  }
  const beforeSrc = beforeSrcRef.current;

  // afterSrc: NO cache-busting (?t=…) — that breaks HTTP range requests
  // which causes the video to flicker/stall (range requests needed for seeking)
  const afterSrc = downloadUrl;

  useEffect(() => {
    return () => {
      // Revoke object URL when result section is unmounted
      if (beforeSrcRef.current) URL.revokeObjectURL(beforeSrcRef.current);
      beforeSrcRef.current = '';
    };
  }, []);

  const [secondsLeft, setSecondsLeft] = useState(EXPIRE_SECONDS);
  const [expired, setExpired]         = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const intervalRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setExpired(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const urgencyClass =
    secondsLeft <= 60
      ? 'text-red-400 animate-pulse'
      : secondsLeft <= 180
      ? 'text-amber-400'
      : 'text-emerald-400';

  // Intercept download link — check if file is still available
  const handleDownloadClick = async (e) => {
    if (expired) {
      e.preventDefault();
      setShowModal(true);
      return;
    }
    // If client timer is running but server may have already deleted (e.g. restart),
    // do a quick pre-flight check
    try {
      const probe = await fetch(downloadUrl, { method: 'HEAD' }).catch(() => null);
      if (probe && probe.status === 410) {
        e.preventDefault();
        setExpired(true);
        clearInterval(intervalRef.current);
        setShowModal(true);
      }
      // else: let browser handle the download normally
    } catch {
      // network error — let browser try anyway
    }
  };

  return (
    <section
      id="section-result"
      className="glass-card rounded-2xl p-6 sm:p-8 mb-6 section-enter"
      aria-label="Enhancement result"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold result-title">Enhancement Complete!</h3>
            <p id="result-meta" className="text-xs text-muted">
              {fileType === 'image'
                ? `Enhanced with ${level} quality · Drag slider to compare`
                : `Enhanced with ${level} quality · Drag line to compare before/after`}
            </p>
          </div>
        </div>
        <button
          id="btn-new-file"
          onClick={onNewFile}
          aria-label="Enhance another file"
          className="text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-3 py-1.5 rounded-lg transition-all duration-200"
        >
          + New File
        </button>
      </div>

      {/* Expiry timer strip */}
      {!expired ? (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-5 timer-strip">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-muted-strong">File will be deleted in</span>
          </div>
          <span className={`text-sm font-mono font-bold tabular-nums ${urgencyClass}`}>
            {formatTime(secondsLeft)}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 expired-strip">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Download link expired</p>
            <p className="text-xs text-muted">This file has been automatically deleted for your privacy.</p>
          </div>
          <button
            onClick={onNewFile}
            className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors duration-200 flex-shrink-0"
          >
            Re-upload
          </button>
        </div>
      )}

      {/* Before/After or Video comparison */}
      {fileType === 'image' ? (
        <ComparisonSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
      ) : (
        <VideoComparisonSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
      )}

      {/* Download button */}
      <a
        id="btn-download"
        href={expired ? '#' : downloadUrl}
        download={!expired}
        onClick={handleDownloadClick}
        className={`btn-success mt-4 ${expired ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Download enhanced file"
        aria-disabled={expired}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {expired ? 'Link Expired' : 'Download Enhanced File'}
      </a>

      {/* Expired Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="File expired"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          {/* Modal Card */}
          <div className="relative z-10 modal-card rounded-2xl p-8 max-w-md w-full shadow-2xl section-enter">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-center modal-title mb-2">Download Link Expired</h2>
            <p className="text-sm text-center text-muted mb-1">
              Your enhanced file has been automatically deleted.
            </p>
            <p className="text-xs text-center text-muted mb-6 opacity-70">
              For your privacy, all files are permanently removed after <strong>10 minutes</strong>. No data is stored on our servers.
            </p>

            {/* Divider */}
            <div className="modal-divider h-px mb-6" />

            <div className="flex flex-col gap-3">
              <button
                id="modal-btn-reupload"
                onClick={() => { setShowModal(false); onNewFile(); }}
                className="btn-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Re-upload & Enhance Again
              </button>
              <button
                id="modal-btn-close"
                onClick={() => setShowModal(false)}
                className="modal-close-btn text-sm font-medium py-2.5 px-4 rounded-xl transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
