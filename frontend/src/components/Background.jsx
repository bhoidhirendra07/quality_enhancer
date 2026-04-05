// Background.jsx — animated gradient orbs
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl animate-pulse-slow" />
      <div
        className="absolute top-1/3 -right-40 w-80 h-80 rounded-full bg-accent-500/15 blur-3xl animate-pulse-slow"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute -bottom-40 left-1/3 w-72 h-72 rounded-full bg-brand-500/10 blur-3xl animate-pulse-slow"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}
