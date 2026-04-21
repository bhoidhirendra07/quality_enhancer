// Hero.jsx — headline, subtitle, stats row
export default function Hero() {
  return (
    <section id="section-hero" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-full mb-6 animate-[float_6s_ease-in-out_infinite]">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
        Instant Enhancement — No Login Required
      </div>

      {/* Headline */}
      <h1 className="hero-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
        Enhance Your Photos &amp;{' '}
        <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-brand-400 bg-clip-text text-transparent">
          Videos
        </span>
      </h1>

      <p className="hero-subtitle text-lg max-w-2xl mx-auto mb-10">
        Upload any photo or video and get a high-quality enhanced version in seconds.
        Upscale, sharpen, denoise — completely free, forever.
      </p>

      {/* Stats */}
      <div className="flex flex-wrap justify-center gap-8 text-center mb-12">
        {[
          { value: '2×–3×', label: 'Resolution Boost' },
          { value: '100%', label: 'Free Forever' },
          { value: '0',    label: 'Login Required' },
          { value: 'Auto', label: 'File Deletion' },
        ].map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-8">
            {i > 0 && <div className="stat-divider w-px h-8 bg-white/10 hidden sm:block" />}
            <div>
              <div className="stat-value text-2xl font-bold">{stat.value}</div>
              <div className="stat-label text-xs mt-0.5" style={{ color: 'var(--text-muted-strong)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
