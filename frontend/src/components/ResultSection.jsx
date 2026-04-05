import ComparisonSlider from './ComparisonSlider';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function ResultSection({ jobId, fileType, file, level, onNewFile }) {
  const downloadUrl = `${API_BASE}/api/enhance/download/${jobId}`;
  const beforeSrc   = file ? URL.createObjectURL(file) : '';
  const afterSrc    = `${downloadUrl}?t=${Date.now()}`;

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
            <h3 className="font-semibold text-white">Enhancement Complete!</h3>
            <p id="result-meta" className="text-xs text-gray-500">
              {fileType === 'image'
                ? `Enhanced with ${level} quality · Drag slider to compare`
                : 'Enhanced video ready · Press play to preview'}
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

      {/* Before/After or Video player */}
      {fileType === 'image' ? (
        <ComparisonSlider beforeSrc={beforeSrc} afterSrc={afterSrc} />
      ) : (
        <div
          id="video-result-container"
          className="relative rounded-xl overflow-hidden bg-black mb-6"
          style={{ aspectRatio: '16/9' }}
        >
          <video
            id="compare-video"
            className="w-full h-full object-contain"
            src={afterSrc}
            controls
          />
        </div>
      )}

      {/* Download button */}
      <a
        id="btn-download"
        href={downloadUrl}
        download
        className="btn-success"
        aria-label="Download enhanced file"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download Enhanced File
      </a>

      <p className="text-center text-xs text-gray-600 mt-2">File will be automatically deleted in 10 minutes</p>
    </section>
  );
}
