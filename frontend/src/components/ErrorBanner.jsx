// ErrorBanner.jsx — dismissable error alert
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      id="section-error"
      className="glass-card rounded-2xl p-6 border border-red-500/20 bg-red-500/5 mb-6 section-enter"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium text-red-400 text-sm">Something went wrong</p>
          <p id="error-message" className="text-xs text-red-300/70 mt-1">{message}</p>
        </div>
        <button
          id="btn-dismiss-error"
          aria-label="Dismiss error"
          onClick={onDismiss}
          className="text-red-400/50 hover:text-red-400 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
