// Background.jsx — animated gradient orbs (theme-aware)
export default function Background({ theme }) {
  const isDark = theme !== 'light';
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">

      {/* Orb 1: top-left indigo */}
      <div
        className={`absolute rounded-full blur-3xl
          ${isDark
            ? 'w-96 h-96 -top-40 -left-40 bg-brand-600/20 animate-pulse-slow'
            : 'w-[500px] h-[500px] -top-48 -left-48 bg-indigo-300/60'}`}
        style={isDark ? {} : { animation: 'orb-drift-1 18s ease-in-out infinite' }}
      />

      {/* Orb 2: top-right violet */}
      <div
        className={`absolute rounded-full blur-3xl
          ${isDark
            ? 'w-80 h-80 top-1/3 -right-40 bg-accent-500/15 animate-pulse-slow'
            : 'w-[420px] h-[420px] -top-32 -right-48 bg-violet-300/55'}`}
        style={isDark ? { animationDelay: '2s' } : { animation: 'orb-drift-2 22s ease-in-out infinite' }}
      />

      {/* Orb 3: bottom-left blue */}
      <div
        className={`absolute rounded-full blur-3xl
          ${isDark
            ? 'w-72 h-72 -bottom-40 left-1/3 bg-brand-500/10 animate-pulse-slow'
            : 'w-[380px] h-[380px] -bottom-40 -left-20 bg-blue-200/60'}`}
        style={isDark ? { animationDelay: '4s' } : { animation: 'orb-drift-3 25s ease-in-out infinite' }}
      />

      {/* Orb 4 (light only): center-right pink-purple */}
      {!isDark && (
        <div
          className="absolute w-[320px] h-[320px] top-1/2 right-1/4 rounded-full blur-3xl bg-purple-200/45"
          style={{ animation: 'orb-drift-4 20s ease-in-out infinite' }}
        />
      )}

      {/* Orb 5 (light only): bottom-right soft rose */}
      {!isDark && (
        <div
          className="absolute w-[280px] h-[280px] -bottom-20 right-0 rounded-full blur-3xl bg-fuchsia-100/60"
          style={{ animation: 'orb-drift-1 28s ease-in-out infinite reverse' }}
        />
      )}

      {/* Animated gradient mesh (light only) */}
      {!isDark && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 20% 30%, rgba(139,92,246,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(99,102,241,0.14) 0%, transparent 70%)',
            animation: 'mesh-shift 14s ease-in-out infinite alternate',
          }}
        />
      )}
    </div>
  );
}
