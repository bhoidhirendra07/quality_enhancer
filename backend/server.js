/**
 * AI Quality Enhancer - Main Server
 * Node.js + Express backend
 * Handles image (Sharp) and video (FFmpeg) enhancement
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const uploadRouter = require('./routes/upload');
const enhanceRouter = require('./routes/enhance');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure temp directories exist ───────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
[UPLOADS_DIR, OUTPUTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve processed output files (for download)
app.use('/outputs', express.static(OUTPUTS_DIR));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/upload', uploadRouter);
app.use('/api/enhance', enhanceRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Quality Enhancer API is running' });
});

// ─── Auto-cleanup: delete temp files older than 10 minutes ───────────────────
const AUTO_DELETE_MS = 10 * 60 * 1000; // 10 minutes

function cleanupOldFiles(directory) {
  if (!fs.existsSync(directory)) return;
  const now = Date.now();
  fs.readdirSync(directory).forEach((file) => {
    const filePath = path.join(directory, file);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > AUTO_DELETE_MS) {
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`[Cleanup] Deleted: ${filePath}`);
      }
    } catch (err) {
      // ignore errors (file already deleted etc.)
    }
  });
}

// Run cleanup every 5 minutes
setInterval(() => {
  cleanupOldFiles(UPLOADS_DIR);
  cleanupOldFiles(OUTPUTS_DIR);
}, 5 * 60 * 1000);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Quality Enhancer API running on http://localhost:${PORT}`);
});

module.exports = app;
