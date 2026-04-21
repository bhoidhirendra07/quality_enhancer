/**
 * Video Enhancer Service
 * Uses FFmpeg (via fluent-ffmpeg + ffmpeg-static) for video enhancement.
 *
 * Enhancement pipeline:
 * 1. Scale up (1.5x / 2x / 2x) with Lanczos
 * 2. Denoise with hqdn3d (light, preserve natural grain)
 * 3. Hair-safe sharpen: gentle luma unsharp + smartblur to protect fine
 *    hair strands from being treated as noise (avoids the "aged hair" effect)
 * 4. Color grade with eq filter (natural brightness & contrast)
 * 5. Optional minimal stylish watermark (drawtext filter)
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path = require('path');

// Point fluent-ffmpeg to the static binaries
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Enhancement presets for video
// Philosophy: preserve the original look, only clean and sharpen.
// Key decisions:
//   brightness = 0.0  → NEVER boost brightness (avoids washed-out / overexposed look)
//   gamma < 1.0       → gently opens shadows WITHOUT blowing highlights
//   unsharp chroma    = 0.0 → luma-only sharpening (colors stay natural)
//   hqdn3d            → gentle denoise, not aggressive
const PRESETS = {
  low: {
    scaleMultiplier: 1.5,
    // Very light denoise — keep natural grain
    hqdn3d: '1:0.7:2:1.5',
    // Hair-safe: gentle luma-only sharpen (low amount to protect fine strands)
    // smartblur after sharpening smooths micro-noise on hair WITHOUT blurring edges
    unsharp: '3:3:0.3:3:3:0.0',
    smartblur: '0.5:0.3:-2',   // lt=0.5px, factor=0.3, threshold=-2 (edge-aware)
    // No brightness boost; slight contrast & saturation
    eq: 'brightness=0:contrast=1.03:saturation=1.05:gamma=0.97',
    crf: 22,
    preset: 'fast',
  },
  medium: {
    scaleMultiplier: 2,
    // Moderate denoise — reduce compression artifacts
    hqdn3d: '2:1.5:3:2.5',
    // Hair-safe: balanced luma-only sharpen — crisp but no halos
    // smartblur threshold keeps fine hair strands naturally smooth
    unsharp: '5:5:0.5:5:5:0.0',
    smartblur: '0.6:0.4:-3',
    // Cinematic grade: no brightness change, mild contrast, warmth
    eq: 'brightness=0:contrast=1.06:saturation=1.1:gamma=0.95',
    crf: 20,
    preset: 'medium',
  },
  high: {
    scaleMultiplier: 2,
    // Stronger denoise for noisy/low-light footage
    hqdn3d: '3.5:2.5:5:4',
    // Hair-safe: controlled luma sharpening — fine detail without overshoot
    // Reduced amount vs before so individual hairs don't pick up edge ringing
    unsharp: '5:5:0.65:5:5:0.0',
    smartblur: '0.8:0.5:-4',
    // Film-like grade: deeper blacks, rich saturation, no overexposure
    eq: 'brightness=0:contrast=1.09:saturation=1.15:gamma=0.93',
    crf: 18,
    preset: 'slow',
  },
};

/**
 * Enhance a video file.
 * @param {string} inputPath  - Path to uploaded video
 * @param {string} outputPath - Path for enhanced output
 * @param {object} options    - { level, addWatermark }
 * @param {function} onProgress - Callback(percent, message)
 */
function enhanceVideo(inputPath, outputPath, options = {}, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const { level = 'medium', addWatermark = false } = options;
    const preset = PRESETS[level] || PRESETS.medium;

    onProgress(5, 'Analyzing video...');

    // First, probe to get dimensions & duration
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(new Error(`Failed to probe video: ${err.message}`));

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found.'));

      const origWidth = videoStream.width;
      const origHeight = videoStream.height;
      const duration = metadata.format.duration;

      onProgress(10, `Video: ${origWidth}x${origHeight}, ${Math.round(duration)}s`);

      // Calculate output dimensions (must be divisible by 2 for H.264)
      const rawWidth = Math.round(origWidth * preset.scaleMultiplier);
      const rawHeight = Math.round(origHeight * preset.scaleMultiplier);

      // Limit to 1920x1080 max on i5 to avoid OOM
      const maxW = 1920, maxH = 1080;
      const ratio = Math.min(1, maxW / rawWidth, maxH / rawHeight);
      const outWidth = Math.round(rawWidth * ratio / 2) * 2;   // ensure even
      const outHeight = Math.round(rawHeight * ratio / 2) * 2;

      onProgress(15, `Upscaling to ${outWidth}x${outHeight}...`);

      // Build FFmpeg filter chain
      const filters = [];

      // Step 1: Scale up with Lanczos
      filters.push(`scale=${outWidth}:${outHeight}:flags=lanczos`);

      // Step 2: Denoise (gentle — preserve natural texture)
      filters.push(`hqdn3d=${preset.hqdn3d}`);

      // Step 3: Hair-safe sharpening
      // unsharp with reduced luma amount + smartblur edge-aware pass.
      // smartblur uses negative threshold so it ONLY smooths low-contrast
      // micro-noise (i.e. hair strand ringing) while leaving true edges untouched.
      filters.push(`unsharp=${preset.unsharp}`);
      filters.push(`smartblur=${preset.smartblur}`);

      // Step 4: Brightness/contrast/saturation
      filters.push(`eq=${preset.eq}`);

      // Step 5: Ultra-minimal stylish watermark
      // - Font size: 0.55% of width (tiny, non-intrusive)
      // - Opacity: 28% white — barely visible
      // - Italic style via fontslant if supported, else plain
      // - Bottom-right corner with tight padding
      if (addWatermark) {
        const wmFontSize = Math.max(8, Math.round(outWidth * 0.0055));
        filters.push(
          `drawtext=text='\u26a1 QuickEnhance':` +
          `fontcolor=white@0.28:fontsize=${wmFontSize}:` +
          `shadowcolor=black@0.2:shadowx=1:shadowy=1:` +
          `x=w-tw-8:y=h-th-6`
        );
      }

      onProgress(20, 'Processing video frames...');

      ffmpeg(inputPath)
        .videoFilters(filters.join(','))
        // Audio: enhance with loudnorm + highpass
        .audioFilters('loudnorm,highpass=f=80')
        // H.264 encoding settings
        .videoCodec('libx264')
        .videoBitrate('0')        // use CRF instead
        .outputOptions([
          `-crf ${preset.crf}`,
          `-preset ${preset.preset}`,
          '-movflags +faststart',  // fast web playback
          '-pix_fmt yuv420p',      // max compatibility
        ])
        .audioCodec('aac')
        .audioBitrate('128k')
        .output(outputPath)
        // FFmpeg reports progress as percentage of duration
        .on('progress', (progress) => {
          // Map FFmpeg 0-100% to our 20-95% range
          const pct = 20 + Math.round((progress.percent || 0) * 0.75);
          onProgress(Math.min(pct, 95), `Processing: ${Math.round(progress.percent || 0)}% frames done`);
        })
        .on('end', () => {
          onProgress(100, 'Video enhanced successfully!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  });
}

module.exports = { enhanceVideo };
