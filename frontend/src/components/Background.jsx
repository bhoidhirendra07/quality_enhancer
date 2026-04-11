// Background.jsx — animated gradient orbs (theme-aware)
export default function Background({ theme }) {
  const isDark = theme !== 'light';
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse-slow
          ${isDark ? 'bg-brand-600/20' : 'bg-brand-400/10'}`}
      />
      <div
        className={`absolute top-1/3 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse-slow
          ${isDark ? 'bg-accent-500/15' : 'bg-accent-400/10'}`}
        style={{ animationDelay: '2s' }}
      />
      <div
        className={`absolute -bottom-40 left-1/3 w-72 h-72 rounded-full blur-3xl animate-pulse-slow
          ${isDark ? 'bg-brand-500/10' : 'bg-indigo-300/15'}`}
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}
