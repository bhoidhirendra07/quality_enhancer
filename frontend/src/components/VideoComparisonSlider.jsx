import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * VideoComparisonSlider
 * Side-by-side split-screen video comparison with synchronized playback.
 *
 * Props:
 *   beforeSrc  — original video (object URL from uploaded file)
 *   afterSrc   — enhanced video (download URL from backend)
 */
export default function VideoComparisonSlider({ beforeSrc, afterSrc }) {
  const containerRef  = useRef(null);
  const handleRef     = useRef(null);
  const beforeVidRef  = useRef(null);
  const afterVidRef   = useRef(null);
  const afterClipRef  = useRef(null);
  const isDragging    = useRef(false);
  const syncLock      = useRef(false); // prevent recursive sync

  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted,    setMuted]    = useState(true);

  // Slider position
  const setPosition = useCallback((clientX) => {
    const container = containerRef.current;
    const handle    = handleRef.current;
    const afterClip = afterClipRef.current;
    if (!container || !handle) return;
    const rect = container.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    handle.style.left = `${pct}%`;
    if (afterClip) afterClip.style.clipPath = `inset(0 0 0 ${pct}%)`;
  }, []);

  // Drag events
  useEffect(() => {
    const handle    = handleRef.current;
    const container = containerRef.current;
    if (!handle || !container) return;

    const onMouseDown  = (e) => { e.preventDefault(); isDragging.current = true; document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none'; };
    const onMouseMove  = (e) => { if (isDragging.current) setPosition(e.clientX); };
    const onMouseUp    = ()  => { isDragging.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    const onTouchStart = ()  => { isDragging.current = true; };
    const onTouchMove  = (e) => { if (!isDragging.current) return; e.preventDefault(); setPosition(e.touches[0].clientX); };
    const onTouchEnd   = ()  => { isDragging.current = false; };
    const onContainerClick = (e) => { if (!handle.contains(e.target)) setPosition(e.clientX); };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    container.addEventListener('click', onContainerClick);

    // Default to 50%
    const r = container.getBoundingClientRect();
    setPosition(r.left + r.width * 0.5);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      handle.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('click', onContainerClick);
    };
  }, [setPosition]);

  // Sync playback between videos 
  const syncVideos = useCallback((source, target) => {
    if (syncLock.current) return;
    syncLock.current = true;
    if (Math.abs(target.currentTime - source.currentTime) > 0.15) {
      target.currentTime = source.currentTime;
    }
    syncLock.current = false;
  }, []);

  // Play / Pause 
  const togglePlay = useCallback(() => {
    const bv = beforeVidRef.current;
    const av = afterVidRef.current;
    if (!bv || !av) return;
    if (bv.paused) {
      // Sync before playing
      av.currentTime = bv.currentTime;
      Promise.all([bv.play(), av.play()]).catch(() => {});
      setPlaying(true);
    } else {
      bv.pause(); av.pause();
      setPlaying(false);
    }
  }, []);

  // Seek
  const handleSeek = useCallback((e) => {
    const bv = beforeVidRef.current;
    const av = afterVidRef.current;
    if (!bv || !av) return;
    const t = parseFloat(e.target.value);
    bv.currentTime = t;
    av.currentTime = t;
    setProgress(t);
  }, []);

  // Wire up video events
  useEffect(() => {
    const bv = beforeVidRef.current;
    const av = afterVidRef.current;
    if (!bv || !av) return;

    const onLoadedMetadata = () => {
      if (bv.duration && isFinite(bv.duration)) setDuration(bv.duration);
    };
    const onTimeUpdate = () => {
      setProgress(bv.currentTime);
      syncVideos(bv, av);
    };
    const onEnded = () => { setPlaying(false); };
    const onAfterTimeUpdate = () => syncVideos(av, bv);

    bv.addEventListener('loadedmetadata', onLoadedMetadata);
    bv.addEventListener('timeupdate', onTimeUpdate);
    bv.addEventListener('ended', onEnded);
    av.addEventListener('timeupdate', onAfterTimeUpdate);

    return () => {
      bv.removeEventListener('loadedmetadata', onLoadedMetadata);
      bv.removeEventListener('timeupdate', onTimeUpdate);
      bv.removeEventListener('ended', onEnded);
      av.removeEventListener('timeupdate', onAfterTimeUpdate);
    };
  }, [syncVideos]);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="mb-6">
      {/* Split-screen container */}
      <div
        ref={containerRef}
        id="video-comparison-container"
        className="relative rounded-xl overflow-hidden bg-black select-none"
        style={{ aspectRatio: '16/9', cursor: 'ew-resize' }}
        aria-label="Before and after video comparison"
      >
        {/* AFTER video — full width, clipped on the left */}
        <div
          ref={afterClipRef}
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: 'inset(0 0 0 50%)' }}
        >
          <video
            ref={afterVidRef}
            id="video-after"
            className="absolute inset-0 w-full h-full object-contain"
            src={afterSrc}
            muted={muted}
            preload="auto"
            playsInline
          />
        </div>

        {/* BEFORE video — full width, beneath */}
        <video
          ref={beforeVidRef}
          id="video-before"
          className="absolute inset-0 w-full h-full object-contain"
          src={beforeSrc}
          muted
          preload="auto"
          playsInline
        />

        {/* Divider line + handle */}
        <div
          ref={handleRef}
          id="video-slider-handle"
          className="absolute top-0 bottom-0 z-20"
          style={{ left: '50%', width: '2px', background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 8px rgba(0,0,0,0.5)' }}
        >
          {/* Grip circle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 z-10 text-xs font-bold text-white px-2 py-1 rounded-md pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>BEFORE</div>
        <div className="absolute top-3 right-3 z-10 text-xs font-bold text-white px-2 py-1 rounded-md pointer-events-none" style={{ background: 'rgba(99,102,241,0.75)', backdropFilter: 'blur(4px)' }}>AFTER</div>

        {/* Centre play overlay (shown when paused) */}
        {!playing && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto"
            aria-label="Play video"
            style={{ background: 'transparent' }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', border: '2px solid rgba(255,255,255,0.5)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Custom controls bar */}
      <div className="flex items-center gap-3 mt-3 px-1">
        {/* Play/Pause */}
        <button
          id="video-play-pause"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        {/* Time */}
        <span className="text-xs font-mono tabular-nums flex-shrink-0" style={{ color: 'var(--text-muted-strong)', minWidth: '72px' }}>
          {formatTime(progress)} / {formatTime(duration)}
        </span>

        {/* Seek bar */}
        <input
          id="video-seek"
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1.5 rounded-full accent-indigo-500 cursor-pointer"
          aria-label="Seek"
          style={{ accentColor: 'var(--brand-500, #6366f1)' }}
        />

        {/* Mute toggle (only after video has audio) */}
        <button
          id="video-mute"
          onClick={() => {
            const av = afterVidRef.current;
            if (av) { av.muted = !av.muted; setMuted(av.muted); }
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-6.536-7.536A5 5 0 005 12a5 5 0 00.464 2.536M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted-strong)' }}>
        ← Drag the white line to compare Before &amp; After →
      </p>
    </div>
  );
}
