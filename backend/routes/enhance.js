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

// Periodic job-store cleanup (prevent memory leak) 
// Evict completed / error / expired jobs older than 20 minutes from memory.
setInterval(() => {
  const cutoff = Date.now() - 20 * 60 * 1000;
  Object.keys(jobs).forEach((id) => {
    const job = jobs[id];
    if (
      (job.status === 'complete' || job.status === 'error' || job.expired) &&
      job.startTime < cutoff
    ) {
      delete jobs[id];
    }
  });
}, 20 * 60 * 1000);

// POST /api/enhance 
router.post('/', async (req, res, next) => {
  try {
    const { jobId, fileType, level = 'medium', addWatermark = false, originalName } = req.body;

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

    // Build the user-friendly download name: "originalname_enhanced.ext"
    // Strip extension from originalName (if provided), then append _enhanced + ext
    let downloadName;
    if (originalName) {
      const origExt = path.extname(originalName);
      const origBase = path.basename(originalName, origExt);
      downloadName = `${origBase}_enhanced${ext}`;
    } else {
      downloadName = `enhanced_${jobId}${ext}`;
    }

    // Initialize job
    jobs[jobId] = {
      status: 'processing',
      progress: 0,
      outputPath,
      outputFileName,
      downloadName,   // friendly name for download
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
        const expireAt = Date.now() + 10 * 60 * 1000;
        jobs[jobId].expiresAt = expireAt;
        setTimeout(() => {
          fs.rmSync(outputPath, { force: true });
          if (jobs[jobId]) jobs[jobId].expired = true;
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

// GET /api/enhance/progress/:jobId  (Server-Sent Events) 
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

  // Heartbeat: send a comment every 15s to prevent Render/proxy idle-timeout (30s)
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // Poll job status and stream updates
  const interval = setInterval(() => {
    const job = jobs[jobId];

    if (!job) {
      sendEvent({ status: 'error', error: 'Job not found.' });
      clearInterval(interval);
      clearInterval(heartbeat);
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
      clearInterval(heartbeat);
      setTimeout(() => res.end(), 500);
    }
  }, 500); // update every 500ms

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// GET /api/enhance/download/:jobId 
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found. Please re-upload and enhance your file.' });
  }

  if (job.expired || !fs.existsSync(job.outputPath)) {
    return res.status(410).json({
      error: 'Your download link has expired.',
      expired: true,
      message: 'Files are automatically deleted after 10 minutes to protect your privacy. Please re-upload and enhance your file again.',
    });
  }

  if (job.status !== 'complete') {
    return res.status(400).json({ error: 'Enhanced file not ready yet.' });
  }

  // Use friendly downloadName if available, else fall back to outputPath filename
  const downloadAs = job.downloadName || `enhanced_${jobId}${path.extname(job.outputPath)}`;
  res.download(job.outputPath, downloadAs);
});

module.exports = router;
