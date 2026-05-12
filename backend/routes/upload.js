/**
 * Upload Route
 * Handles file uploads with validation.
 * Returns: jobId, fileType, previewUrl, fileName, fileSize
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { validateFileType, validateVideoLength, IMAGE_TYPES, VIDEO_TYPES } = require('../middleware/validate');

const router = express.Router();

// Multer storage config 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // jobId_originalname to keep unique filenames
    const jobId = uuidv4();
    req.jobId = jobId; // attach to request
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${jobId}${ext}`);
  },
});

// File filter: accept all image & video types supported by the app
const fileFilter = (req, file, cb) => {
  if (IMAGE_TYPES.has(file.mimetype) || VIDEO_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Supported images: JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF, HEIC. ' +
        'Supported videos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max (images validated more strictly below)
  },
});

// POST /api/upload 
router.post('/', upload.single('file'), validateFileType, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    // Determine media kind by MIME type (more reliable than extension)
    const fileType = IMAGE_TYPES.has(file.mimetype) ? 'image' : 'video';

    // For video files: validate duration ≤ 60 seconds
    if (fileType === 'video') {
      try {
        await validateVideoLength(file.path);
      } catch (err) {
        // Delete the file and reject
        const fs = require('fs');
        fs.rmSync(file.path, { force: true });
        return res.status(400).json({ error: err.message });
      }
    }

    // For images: check max size (50MB)
    if (fileType === 'image' && file.size > 50 * 1024 * 1024) {
      const fs = require('fs');
      fs.rmSync(file.path, { force: true });
      return res.status(400).json({ error: 'Image file too large. Maximum 50MB allowed.' });
    }

    const jobId = path.basename(file.filename, ext);

    return res.json({
      success: true,
      jobId,
      fileType,
      fileName: file.originalname,
      fileSize: file.size,
      filePath: file.path, // internal use
      previewUrl: null,    // generated client-side from file input
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
