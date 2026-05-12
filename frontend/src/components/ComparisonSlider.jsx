import { useRef, useEffect, useCallback } from 'react';

/**
 * ComparisonSlider — before/after image slider
 * Props:
 *   beforeSrc  — original image URL
 *   afterSrc   — enhanced image URL
 */
export default function ComparisonSlider({ beforeSrc, afterSrc }) {
  const containerRef = useRef(null);
  const handleRef    = useRef(null);
  const afterClipRef = useRef(null);
  const isDragging   = useRef(false);

  const setPosition = useCallback((clientX) => {
    const container = containerRef.current;
    const handle    = handleRef.current;
    const afterClip = afterClipRef.current;
    if (!container || !handle) return;

    const rect = container.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    handle.style.left = `${pct}%`;
    if (afterClip) afterClip.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.setAttribute('aria-valuenow', Math.round(pct));
  }, []);

  useEffect(() => {
    const handle    = handleRef.current;
    const container = containerRef.current;
    if (!handle || !container) return;

    const onMouseDown = (e) => {
      e.preventDefault();
      isDragging.current = true;
      document.body.style.cursor    = 'ew-resize';
      document.body.style.userSelect = 'none';
    };
    const onMouseMove = (e) => { if (isDragging.current) setPosition(e.clientX); };
    const onMouseUp   = () => {
      isDragging.current = false;
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
    const onContainerClick = (e) => {
      if (e.target === handle || handle.contains(e.target)) return;
      setPosition(e.clientX);
    };
    const onTouchStart = () => { isDragging.current = true; };
    const onTouchMove  = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      setPosition(e.touches[0].clientX);
    };
    const onTouchEnd   = () => { isDragging.current = false; };
    const onKeyDown    = (e) => {
      const rect = container.getBoundingClientRect();
      const cur  = parseFloat(handle.style.left) || 50;
      let next   = cur;
      if (e.key === 'ArrowLeft')  next = Math.max(0, cur - 2);
      if (e.key === 'ArrowRight') next = Math.min(100, cur + 2);
      if (e.key === 'Home') next = 0;
      if (e.key === 'End')  next = 100;
      if (next !== cur) {
        e.preventDefault();
        setPosition(rect.left + (next / 100) * rect.width);
      }
    };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    container.addEventListener('click', onContainerClick);
    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    handle.addEventListener('keydown', onKeyDown);

    // Initial 50% position
    const r = container.getBoundingClientRect();
    setPosition(r.left + r.width * 0.5);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('click', onContainerClick);
      handle.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      handle.removeEventListener('keydown', onKeyDown);
    };
  }, [setPosition]);

  return (
    <div
      ref={containerRef}
      id="comparison-container"
      className="comparison-container relative rounded-xl overflow-hidden bg-black mb-6 select-none"
      aria-label="Before and after comparison"
    >
      {/* Before image (full) */}
      <img id="compare-before" src={beforeSrc} alt="Original" className="w-full h-full object-contain block" />

      {/* After image (clipped) — absolutely positioned to overlay the before */}
      <div ref={afterClipRef} id="compare-after-clip" className="absolute inset-0 overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }}>
        <img id="compare-after" src={afterSrc} alt="Enhanced" className="absolute inset-0 w-full h-full object-contain" />
      </div>

      {/* Slider handle */}
      <div
        ref={handleRef}
        id="slider-handle"
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize z-10"
        style={{ left: '50%', willChange: 'left' }}
        role="slider"
        aria-label="Comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={50}
        tabIndex={0}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 text-xs font-semibold text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">BEFORE</div>
      <div className="absolute top-3 right-3 text-xs font-semibold text-white bg-brand-500/80 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">AFTER</div>
    </div>
  );
}
