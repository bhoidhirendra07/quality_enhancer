import { useRef, useState, useCallback } from 'react';

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;   // 50 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;  // 500 MB

// All accepted image MIME types
const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/gif', 'image/bmp', 'image/tiff', 'image/avif',
  'image/heic', 'image/heif',
  // SVG removed: server cannot meaningfully upscale vector graphics
]);

// All accepted video MIME types
const VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'video/x-matroska', 'video/webm', 'video/x-flv',
  'video/x-ms-wmv', 'video/3gpp', 'video/3gpp2', 'video/ogg',
]);

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,.avif,.heic,.heif';
const VIDEO_ACCEPT = '.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.3gp,.3g2,.ogv';
const ALL_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file) {
  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);

  if (!isImage && !isVideo)
    return `Unsupported type: ${file.type || 'unknown'}. Please upload a supported image or video file.`;
  if (isVideo && file.size > MAX_VIDEO_SIZE)
    return `Video too large (${formatSize(file.size)}). Max is 500 MB.`;
  if (isImage && file.size > MAX_IMAGE_SIZE)
    return `Image too large (${formatSize(file.size)}). Max is 50 MB.`;
  return null;
}

export default function UploadSection({ onUploaded, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null); // { name, meta, type, objectUrl }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    const err = validateFile(file);
    if (err) { onError(err); return; }

    // Build preview
    const objectUrl = URL.createObjectURL(file);
    setPreview({ name: file.name, meta: `${formatSize(file.size)} · ${file.type}`, type: file.type, objectUrl, file });

    // Upload
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      onUploaded({ jobId: data.jobId, fileType: data.fileType, file, fileName: data.fileName });
    } catch (e) {
      onError(e.message || 'Upload failed. Is the backend running?');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUploaded, onError]);

  const handleRemove = () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploaded(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <section id="section-upload" className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
      {/* Drop Zone */}
      <div
        id="drop-zone"
        role="button"
        tabIndex={0}
        aria-label="Upload file area"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        className={`relative border-2 border-dashed rounded-xl p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 group
          ${isDragging ? 'drop-zone-active border-brand-500/60 bg-brand-500/5' : 'border-white/20 hover:border-brand-500/60 hover:bg-brand-500/5'}`}
      >
        {/* Upload icon */}
        <div className={`drop-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 border border-brand-500/20
          flex items-center justify-center mx-auto mb-4 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <h2 className="drop-zone-title text-xl font-semibold mb-2" style={{ color: 'var(--text-base)' }}>
          {uploading ? 'Uploading...' : 'Drop your file here'}
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>or click to browse</p>
        <p className="text-xs" style={{ color: 'var(--text-muted-strong)' }}>
          Images: JPG, PNG, WebP, GIF, BMP, TIFF, AVIF, HEIC (max 50 MB)
          <span className="mx-1 opacity-40">·</span>
          Videos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP (max 500 MB, 60s)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          id="file-input"
          accept={ALL_ACCEPT}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          aria-label="File input"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* File Preview */}
      {preview && (
        <div id="file-preview" className="mt-6 section-enter">
          <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: 'var(--preview-bg)', borderColor: 'var(--preview-border)' }}>
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
              {preview.type.startsWith('image/') && (
                <img src={preview.objectUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
              {VIDEO_TYPES.has(preview.type) && (
                <video src={preview.objectUrl} className="w-full h-full object-cover" muted />
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p id="preview-name" className="font-medium truncate text-sm" style={{ color: 'var(--text-base)' }}>{preview.name}</p>
              <p id="preview-meta" className="text-xs mt-0.5" style={{ color: 'var(--text-muted-strong)' }}>{preview.meta}</p>
              {uploading && <p className="text-xs text-brand-400 mt-1 animate-pulse">Uploading to server...</p>}
            </div>
            {/* Remove */}
            {!uploading && (
              <button
                id="btn-remove-file"
                aria-label="Remove file"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 transition-all duration-200 flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
