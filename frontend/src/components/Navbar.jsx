// Navbar.jsx — sticky top nav with logo, free badge, theme toggle
export default function Navbar({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: theme === 'dark' ? 'rgba(2, 6, 23, 0.85)' : 'rgba(255, 255, 255, 0.88)',
        borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.12)',
      }}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group" id="nav-logo">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            QuickEnhance
          </span>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% Free
          </span>

          {/* Theme toggle */}
          <button
            id="theme-toggle"
            aria-label="Toggle dark/light mode"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 border"
            style={{
              background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.07)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)',
            }}
          >
            {theme === 'dark' ? (
              /* Sun — switch to light */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              /* Moon — switch to dark */
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
