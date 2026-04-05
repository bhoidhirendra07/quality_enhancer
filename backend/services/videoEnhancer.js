/**
 * Video Enhancer Service
 * Uses FFmpeg (via fluent-ffmpeg + ffmpeg-static) for video enhancement.
 *
 * Enhancement pipeline:
 * 1. Scale up (1.5x / 2x / 2x) with Lanczos
 * 2. Denoise with hqdn3d filter
 * 3. Sharpen with unsharp mask
 * 4. Improve brightness/contrast with eq filter
 * 5. Optional watermark (drawtext filter)
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');

// Point fluent-ffmpeg to the static binary
ffmpeg.setFfmpegPath(ffmpegPath);

// Enhancement presets for video
const PRESETS = {
  low: {
    scaleMultiplier: 1.5,
    hqdn3d: '2:1.5:4:3',         // light denoise
    unsharp: '3:3:0.8:3:3:0.4',  // light sharpen
    eq: 'brightness=0.03:contrast=1.05:saturation=1.05',
    crf: 22, // lower = better quality
    preset: 'fast',
  },
  medium: {
    scaleMultiplier: 2,
    hqdn3d: '4:3:6:4.5',
    unsharp: '5:5:1.0:5:5:0.5',
    eq: 'brightness=0.05:contrast=1.1:saturation=1.1',
    crf: 20,
    preset: 'medium',
  },
  high: {
    scaleMultiplier: 2,          // keep 2x for i5 performance
    hqdn3d: '6:4.5:10:7.5',
    unsharp: '7:7:1.5:7:7:0.8',
    eq: 'brightness=0.08:contrast=1.15:saturation=1.15',
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

      // Step 2: Denoise
      filters.push(`hqdn3d=${preset.hqdn3d}`);

      // Step 3: Sharpen
      filters.push(`unsharp=${preset.unsharp}`);

      // Step 4: Brightness/contrast/saturation
      filters.push(`eq=${preset.eq}`);

      // Step 5: Watermark via drawtext
      if (addWatermark) {
        filters.push(
          `drawtext=text='Enhanced by QualityAI':` +
          `fontcolor=white@0.6:fontsize=${Math.round(outWidth * 0.02)}:` +
          `x=w-tw-20:y=h-th-20`
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
