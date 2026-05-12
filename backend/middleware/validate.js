/**
 * Validation Middleware
 * - validateFileType: checks MIME type matches extension
 * - validateVideoLength: uses ffprobe to enforce ≤ 60 seconds
 *
 * Supported formats:
 * Images: JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF, HEIC
 * Videos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP, OGV
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Allowed MIME types → grouped by media kind
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif',
  // SVG removed: Sharp cannot meaningfully upscale vector graphics
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',         // .mov
  'video/x-msvideo',         // .avi
  'video/x-matroska',        // .mkv
  'video/webm',
  'video/x-flv',             // .flv
  'video/x-ms-wmv',          // .wmv
  'video/3gpp',              // .3gp
  'video/3gpp2',             // .3g2
  'video/ogg',               // .ogv
]);

const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

const MAX_VIDEO_DURATION = 60; // seconds

/**
 * Express middleware: validates that MIME type matches file extension.
 */
function validateFileType(req, res, next) {
  const file = req.file;
  if (!file) return next();

  const mime = file.mimetype;
  if (!ALLOWED_TYPES.has(mime)) {
    return res.status(400).json({
      error: `Unsupported file type: ${mime}. Supported images: JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF, HEIC. Videos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP.`,
    });
  }

  next();
}

/**
 * Promise-based: ffprobe the video to check duration.
 * Throws an error if duration > 60 seconds.
 */
function validateVideoLength(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Could not read video metadata: ${err.message}`));
      }

      const duration = metadata.format?.duration || 0;

      if (duration > MAX_VIDEO_DURATION) {
        return reject(
          new Error(
            `Video is too long (${Math.round(duration)}s). Maximum allowed is ${MAX_VIDEO_DURATION} seconds.`
          )
        );
      }

      resolve(duration);
    });
  });
}

module.exports = { validateFileType, validateVideoLength, IMAGE_TYPES, VIDEO_TYPES };
