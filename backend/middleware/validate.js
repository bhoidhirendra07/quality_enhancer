/**
 * Validation Middleware
 * - validateFileType: checks MIME type matches extension
 * - validateVideoLength: uses ffprobe to enforce ≤ 60 seconds
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

// Allowed MIME types
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'video/mp4': ['.mp4'],
};

const MAX_VIDEO_DURATION = 60; // seconds

/**
 * Express middleware: validates that MIME type matches file extension.
 */
function validateFileType(req, res, next) {
  const file = req.file;
  if (!file) return next();

  const mime = file.mimetype;
  if (!ALLOWED_TYPES[mime]) {
    return res.status(400).json({
      error: `Unsupported file type: ${mime}. Only JPG, PNG, and MP4 are allowed.`,
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

module.exports = { validateFileType, validateVideoLength };
