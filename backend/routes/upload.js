/**
 * Upload Route
 * Handles file uploads with validation.
 * Returns: jobId, fileType, previewUrl, fileName, fileSize
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { validateFileType, validateVideoLength } = require('../middleware/validate');

const router = express.Router();

// ─── Multer storage config ────────────────────────────────────────────────────
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

// File filter: only allow jpg, jpeg, png, mp4
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'video/mp4'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and MP4 are supported.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (will validate more strictly per type)
  },
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────
router.post('/', upload.single('file'), validateFileType, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const fileType = ['.jpg', '.jpeg', '.png'].includes(ext) ? 'image' : 'video';

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
