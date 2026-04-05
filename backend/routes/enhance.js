/**
 * Enhance Route
 * Triggers image or video enhancement and streams progress via SSE.
 *
 * Endpoints:
 *   POST /api/enhance        - Start enhancement job
 *   GET  /api/enhance/progress/:jobId - SSE progress stream
 *   GET  /api/enhance/download/:jobId - Download result
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { enhanceImage } = require('../services/imageEnhancer');
const { enhanceVideo } = require('../services/videoEnhancer');

const router = express.Router();

// In-memory job store (no DB needed — temp only)
// Structure: { [jobId]: { status, progress, outputPath, error, fileType } }
const jobs = {};

// ─── POST /api/enhance ────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { jobId, fileType, level = 'medium', addWatermark = false } = req.body;

    if (!jobId || !fileType) {
      return res.status(400).json({ error: 'jobId and fileType are required.' });
    }

    // Find uploaded file
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = fs.readdirSync(uploadsDir);
    const uploadedFile = files.find((f) => f.startsWith(jobId));

    if (!uploadedFile) {
      return res.status(404).json({ error: 'Uploaded file not found. Please re-upload.' });
    }

    const inputPath = path.join(uploadsDir, uploadedFile);
    const ext = path.extname(uploadedFile);
    const outputFileName = `enhanced_${jobId}${ext}`;
    const outputPath = path.join(__dirname, '../outputs', outputFileName);

    // Initialize job
    jobs[jobId] = {
      status: 'processing',
      progress: 0,
      outputPath,
      outputFileName,
      error: null,
      fileType,
      startTime: Date.now(),
    };

    // Progress callback — updates job store (SSE clients poll this)
    const onProgress = (pct, message) => {
      if (jobs[jobId]) {
        jobs[jobId].progress = pct;
        jobs[jobId].message = message;
      }
    };

    // Return immediately so SSE can connect; process in background
    res.json({ success: true, jobId, message: 'Processing started.' });

    // Run enhancement asynchronously
    (async () => {
      try {
        if (fileType === 'image') {
          await enhanceImage(inputPath, outputPath, { level, addWatermark }, onProgress);
        } else {
          await enhanceVideo(inputPath, outputPath, { level, addWatermark }, onProgress);
        }

        jobs[jobId].status = 'complete';
        jobs[jobId].progress = 100;
        jobs[jobId].message = 'Enhancement complete!';

        // Delete original upload
        fs.rmSync(inputPath, { force: true });

        // Schedule output deletion after 10 minutes
        setTimeout(() => {
          fs.rmSync(outputPath, { force: true });
          delete jobs[jobId];
        }, 10 * 60 * 1000);

      } catch (err) {
        console.error(`[Job ${jobId}] Error:`, err.message);
        jobs[jobId].status = 'error';
        jobs[jobId].error = err.message;
        fs.rmSync(inputPath, { force: true });
      }
    })();

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/enhance/progress/:jobId  (Server-Sent Events) ──────────────────
router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Poll job status and stream updates
  const interval = setInterval(() => {
    const job = jobs[jobId];

    if (!job) {
      sendEvent({ status: 'error', error: 'Job not found.' });
      clearInterval(interval);
      res.end();
      return;
    }

    const elapsed = Math.round((Date.now() - job.startTime) / 1000);
    sendEvent({
      status: job.status,
      progress: job.progress,
      message: job.message || 'Processing...',
      elapsed,
      error: job.error,
    });

    if (job.status === 'complete' || job.status === 'error') {
      clearInterval(interval);
      setTimeout(() => res.end(), 500);
    }
  }, 500); // update every 500ms

  // Clean up on client disconnect
  req.on('close', () => clearInterval(interval));
});

// ─── GET /api/enhance/download/:jobId ─────────────────────────────────────────
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job || job.status !== 'complete') {
    return res.status(404).json({ error: 'Enhanced file not ready or not found.' });
  }

  if (!fs.existsSync(job.outputPath)) {
    return res.status(410).json({ error: 'File has been deleted. Please re-process.' });
  }

  res.download(job.outputPath, `enhanced_${jobId}${path.extname(job.outputPath)}`);
});

module.exports = router;
