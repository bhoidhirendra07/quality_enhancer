import { useState } from 'react';

const LEVELS = [
  { id: 'low',    label: 'Low',    sub: '1.5× upscale · Fast',        time: '~30s',   timeColor: 'text-emerald-400' },
  { id: 'medium', label: 'Medium', sub: '2× upscale · Balanced',       time: '~60s',   timeColor: 'text-brand-400' },
  { id: 'high',   label: 'High',   sub: '3× upscale · Best quality',   time: '~2–3min',timeColor: 'text-amber-400' },
];

export default function OptionsSection({ onEnhance }) {
  const [level, setLevel] = useState('medium');
  const [watermark, setWatermark] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEnhance = async () => {
    setLoading(true);
    await onEnhance({ level, addWatermark: watermark });
    setLoading(false);
  };

  return (
    <section id="section-options" className="glass-card rounded-2xl p-6 sm:p-8 mb-6 section-enter" aria-label="Enhancement options">
      {/* Header */}
      <h3 className="options-heading font-semibold mb-5 flex items-center gap-2" style={{ color: 'var(--text-base)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Enhancement Options
      </h3>

      {/* Level selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Enhancement Level</label>
        <div className="flex gap-3" role="radiogroup" aria-label="Enhancement level">
          {LEVELS.map((l) => {
            const isSelected = level === l.id;
            return (
              <label key={l.id} className="flex-1 cursor-pointer" id={`level-${l.id}-label`}>
                <input
                  type="radio"
                  name="level"
                  id={`level-${l.id}`}
                  value={l.id}
                  checked={isSelected}
                  onChange={() => setLevel(l.id)}
                  className="sr-only"
                />
                <div className={`p-4 rounded-xl border text-center transition-all duration-200
                  ${isSelected
                    ? 'border-brand-500/50 bg-brand-500/10'
                    : 'border-white/10 bg-white/5 hover:border-brand-500/50 hover:bg-brand-500/5'
                  }`}
                >
                  <div className={`text-lg font-bold mb-0.5 ${isSelected ? 'text-brand-400' : 'text-white'}`}>{l.label}</div>
                  <div className={`text-xs ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>{l.sub}</div>
                  <div className={`text-xs mt-1 ${l.timeColor}`}>{l.time}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Watermark toggle */}
      <div className="flex items-center justify-between py-3 border-t border-white/5">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>Add Watermark</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted-strong)' }}>Adds &quot;Enhanced by QualityAI&quot; text overlay</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer" id="watermark-toggle-label">
          <input
            type="checkbox"
            id="watermark-toggle"
            checked={watermark}
            onChange={(e) => setWatermark(e.target.checked)}
            className="sr-only peer"
            aria-label="Add watermark"
          />
          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 border border-white/20" />
        </label>
      </div>

      {/* Enhance Button */}
      <button
        id="btn-enhance"
        onClick={handleEnhance}
        disabled={loading}
        className="btn-primary mt-6"
        aria-label="Start enhancement"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Starting Enhancement...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Enhance Now
          </>
        )}
      </button>
    </section>
  );
}
