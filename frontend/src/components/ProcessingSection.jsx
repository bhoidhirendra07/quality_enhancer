import { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const CIRCUMFERENCE = 2 * Math.PI * 34;

const STEP_LABELS = ['Upload', 'Analyze', 'Enhance', 'Finalize'];
const STEP_THRESHOLDS = [
  { pct: 0,  step: 0 },
  { pct: 15, step: 1 },
  { pct: 30, step: 2 },
  { pct: 90, step: 3 },
];

function getActiveStep(pct) {
  let active = 0;
  for (const t of STEP_THRESHOLDS) { if (pct >= t.pct) active = t.step; }
  return active;
}

export default function ProcessingSection({ jobId, fileType, level, onComplete, onError }) {
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [elapsed, setElapsed] = useState(0);
  const [eta, setEta] = useState('');
  const startTimeRef = useRef(Date.now());
  const lastPctRef = useRef(0);

  useEffect(() => {
    if (!jobId) return;
    startTimeRef.current = Date.now();

    const es = new EventSource(`${API_BASE}/api/enhance/progress/${jobId}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.status === 'error') {
        es.close();
        onError(data.error || 'Enhancement failed.');
        return;
      }

      if (data.status === 'processing') {
        const newPct = Math.max(lastPctRef.current, data.progress || 0);
        lastPctRef.current = newPct;
        setPct(newPct);
        setMessage(data.message || 'Processing...');
        setElapsed(data.elapsed || 0);

        // Compute ETA
        if (newPct > 5 && newPct < 100) {
          const elapsedMs = Date.now() - startTimeRef.current;
          const totalEst = (elapsedMs / newPct) * 100;
          const rem = Math.round((totalEst - elapsedMs) / 1000);
          setEta(rem > 0 ? `~${rem}s remaining` : '');
        }
      }

      if (data.status === 'complete') {
        setPct(100);
        setMessage('Enhancement complete!');
        setElapsed(data.elapsed || 0);
        setEta('');
        es.close();
        setTimeout(() => onComplete(), 600);
      }
    };

    es.onerror = () => {
      es.close();
      onError('Lost connection to server. Please try again.');
    };

    return () => es.close();
  }, [jobId, onComplete, onError]);

  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const activeStep = getActiveStep(pct);

  return (
    <section
      id="section-processing"
      className="glass-card rounded-2xl p-6 sm:p-8 mb-6 section-enter"
      aria-label="Processing status"
      aria-live="polite"
    >
      {/* Spinner ring + percentage */}
      <div className="text-center mb-6">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
            <circle
              id="progress-ring"
              cx="40" cy="40" r="34"
              fill="none"
              stroke="url(#grad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span id="progress-pct" className="text-sm font-bold text-white">{Math.round(pct)}%</span>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white mb-1">Enhancing your file...</h3>
        <p id="progress-message" className="text-sm text-gray-400">{message}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/5 rounded-full h-2 mb-3 overflow-hidden">
        <div
          id="progress-bar"
          className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 shimmer-bar transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-600">
        <span id="progress-elapsed">{elapsed}s elapsed</span>
        <span id="progress-eta">{eta}</span>
      </div>

      {/* Step indicators */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2" id="steps-container">
        {STEP_LABELS.map((label, idx) => {
          const isDone   = idx < activeStep;
          const isActive = idx === activeStep;
          return (
            <div
              key={label}
              className={`flex items-center gap-1.5 text-xs p-2 rounded-lg bg-white/5 transition-all duration-300
                ${isDone ? 'step-done' : isActive ? 'step-active' : 'text-gray-600'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300
                ${isDone ? 'bg-emerald-400' : isActive ? 'bg-brand-400 animate-pulse' : 'bg-gray-600'}`}
              />
              {label}
            </div>
          );
        })}
      </div>
    </section>
  );
}
