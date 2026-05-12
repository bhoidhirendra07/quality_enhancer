# QuickEnhance — Complete Project

## What the App Does

**QuickEnhance** is a free, no-login AI photo & video enhancer. Users upload an image or video, choose an enhancement level, and get back a sharpened, upscaled, denoised file — all processed server-side and auto-deleted after 10 minutes.

---

## Architecture Overview

```
Browser (React 19 + Vite + Tailwind)
        │
        │  HTTP REST + Server-Sent Events (SSE)
        ▼
Express Backend (Node.js)
    ├── /api/upload                    → receives file, saves to /uploads
    ├── /api/enhance                   → starts Sharp/FFmpeg job, returns jobId
    ├── /api/enhance/progress/:jobId   → SSE stream (real-time %)
    └── /api/enhance/download/:jobId   → streams enhanced file to browser
        │
        ├── Sharp   → image: Lanczos upscale → denoise → normalize → sharpen → save
        └── FFmpeg  → video: scale → hqdn3d → unsharp/smartblur → eq → H.264
```

---

## Full Folder Structure

```
quality_enhancer/
├── backend/
│   ├── server.js               ← Express entry point — middleware, routes, cleanup
│   ├── routes/
│   │   ├── upload.js           ← POST /api/upload
│   │   └── enhance.js          ← POST /api/enhance + SSE + download
│   ├── middleware/
│   │   └── validate.js         ← MIME type + video length validation
│   ├── services/
│   │   ├── imageEnhancer.js    ← Sharp pipeline (the real image logic)
│   │   └── videoEnhancer.js    ← FFmpeg pipeline (the real video logic)
│   ├── uploads/                ← Temp: incoming raw files (auto-deleted)
│   ├── outputs/                ← Temp: enhanced output files (auto-deleted)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── index.html              ← HTML shell + SEO meta tags + Google Fonts
│   ├── vite.config.js
│   ├── tailwind.config.js      ← Custom brand/accent color palette
│   ├── .env.example            ← VITE_API_BASE
│   └── src/
│       ├── main.jsx            ← React 19 root mount
│       ├── index.css           ← Design system (CSS variables, glass, animations)
│       ├── App.jsx             ← State machine (idle → options → processing → complete)
│       └── components/
│           ├── Background.jsx            ← Animated gradient orbs (dark + light)
│           ├── Navbar.jsx                ← Logo, "100% Free" badge, theme toggle
│           ├── Hero.jsx                  ← Headline, subtitle, stats row
│           ├── UploadSection.jsx         ← Drag-and-drop picker + upload to server
│           ├── OptionsSection.jsx        ← Level selector + watermark toggle
│           ├── ProcessingSection.jsx     ← SSE progress ring + step indicators
│           ├── ResultSection.jsx         ← Timer, download, before/after comparison
│           ├── ComparisonSlider.jsx      ← Image drag-slider (before vs after)
│           ├── VideoComparisonSlider.jsx ← Video split-screen + synchronized controls
│           └── ErrorBanner.jsx           ← Dismissable error strip
│
├── render.yaml                 ← Render.com backend deployment config
├── PROJECT_EXPLAINED.md        ← Bilingual (Hindi+English) learning guide
├── PROJECT_ANALYSIS.md         ← This file — full technical walkthrough
└── README.md
```

---

## Data Flow — Step by Step

### 1. User Opens the App

- `index.html` loads → Vite serves the React SPA
- `App.jsx` initialises with `phase = 'idle'`
- Theme is read from `localStorage` (`'dark'` by default)
- `Background.jsx` renders animated CSS gradient orbs
- `Navbar.jsx` shows logo + "100% Free" badge + theme toggle button

---

### 2. File Upload (`UploadSection.jsx`)

**Client side:**
1. User drags a file or clicks the drop zone
2. `validateFile()` runs client-side:
   - MIME type checked against `IMAGE_TYPES` / `VIDEO_TYPES` sets
   - Size: images ≤ 50 MB, videos ≤ 500 MB
3. `URL.createObjectURL(file)` → local thumbnail preview
4. `FormData` POSTed to `POST /api/upload`

**Server — `routes/upload.js`:**
- **Multer** saves file as `{uuid}{ext}` inside `/uploads/`
- `validateFileType` middleware re-checks MIME server-side
- For videos: `validateVideoLength()` runs `ffprobe` → rejects if > 60 s
- For images: rejects if > 50 MB
- Returns `{ jobId, fileType, fileName, fileSize }`

**App.jsx** stores `jobId`, `fileType`, `fileName`, `file` → `phase = 'options'`

---

### 3. Enhancement Options (`OptionsSection.jsx`)

- User picks **Low / Medium / High** via radio buttons
- Optional **watermark** toggle (tiny ⚡ mark)
- Clicks **"Enhance Now"**

`handleEnhance` in `App.jsx` fires:
```
POST /api/enhance
Body: { jobId, fileType, level, addWatermark, originalName }
```

---

### 4. Enhancement Job Starts (`routes/enhance.js`)

1. Locate uploaded file in `/uploads/` by `jobId`
2. Build output path: `outputs/enhanced_{jobId}.ext`
3. Build friendly download name: `"originalFile_enhanced.jpg"`
4. Register job: `jobs[jobId] = { status: 'processing', progress: 0, ... }`
5. **Return immediately** → `{ success: true }` (so SSE can connect right away)
6. Run enhancement **asynchronously** in background IIFE:
   - Image → `enhanceImage()`
   - Video → `enhanceVideo()`
7. On completion:
   - `jobs[jobId].status = 'complete'`
   - Delete original upload
   - `setTimeout` → delete output in 10 minutes

---

### 5. Real-Time Progress (`ProcessingSection.jsx`)

```js
const es = new EventSource(`/api/enhance/progress/${jobId}`);
```

Backend polls `jobs[jobId]` every **500 ms** and pushes SSE events:
```
data: {"status":"processing","progress":30,"message":"Applying sharpening...","elapsed":8}
data: {"status":"processing","progress":75,"message":"Final sharpening pass...","elapsed":18}
data: {"status":"complete","progress":100,"elapsed":22}
```

UI updates:
- SVG circular ring (`stroke-dashoffset` animation)
- Shimmer progress bar
- Step indicators: Upload → Analyze → Enhance → Finalize
- ETA calculation (elapsed / pct × 100 = estimated total)

`status === 'complete'` → SSE closes → `onComplete()` → `phase = 'complete'`

---

### 6. Image Enhancement Pipeline (`imageEnhancer.js`)

Uses **Sharp** (libvips-based — very fast C++ library):

| Step | Operation | Sharp Call |
|------|-----------|-----------|
| 1 | Read metadata | `.metadata()` |
| 2 | **Lanczos3 Upscale** | `.resize(W, H, { kernel: 'lanczos3' })` |
| 3 | Median denoise | `.median(3 or 5)` |
| 4 | Auto-level histogram | `.normalise()` |
| 5 | Brightness + saturation | `.modulate({ brightness, saturation })` |
| 6 | Edge sharpening | `.sharpen({ sigma, flat, jagged })` |
| 7 | Optional watermark | `.composite([{ input: svgBuffer }])` |
| 8 | Save output | `.jpeg(95)` / `.png(100)` / `.webp(92)` |

**Presets:**
| Level  | Scale | Sigma | Denoise | Brightness | Saturation |
|--------|-------|-------|---------|------------|------------|
| Low    | 1.5×  | 0.5   | None    | +2%        | +5%        |
| Medium | 2×    | 0.8   | 3px     | +5%        | +10%       |
| High   | 3×    | 1.2   | 5px     | +8%        | +15%       |

> Max output dimension clamped to **6000 px** to protect low-end machines.

---

### 7. Video Enhancement Pipeline (`videoEnhancer.js`)

Uses **FFmpeg** (via `fluent-ffmpeg` + `ffmpeg-static` bundled binary):

| Filter | Purpose |
|--------|---------|
| `scale=W:H:flags=lanczos` | Upscale (max 1920×1080) |
| `hqdn3d` | 3D temporal+spatial denoise — removes compression artifacts |
| `unsharp` | Luma-only sharpening (no colour halos) |
| `smartblur` | Edge-aware micro-noise smoothing (protects hair strands) |
| `eq` | Contrast / saturation / gamma — **brightness=0 (no overexposure)** |
| `drawtext` | Optional ⚡ watermark (0.28 opacity — ultra subtle) |
| Audio | `loudnorm,highpass=f=80` — normalise + remove low-frequency rumble |
| Codec | H.264 (CRF 18–22) + AAC 128k + `-movflags +faststart` |

**Presets:**
| Level  | Scale | CRF | FFmpeg Preset | Denoise      |
|--------|-------|-----|---------------|--------------|
| Low    | 1.5×  | 22  | `fast`        | Light        |
| Medium | 2×    | 20  | `medium`      | Moderate     |
| High   | 2×    | 18  | `slow`        | Strong       |

> High level uses **2× not 3×** for video — 3× at 1080p source would exceed i5 RAM.

---

### 8. Result Section (`ResultSection.jsx`)

- **10-minute countdown timer** — colour shifts: green → amber → red (pulsing)
- **Image comparison** → `ComparisonSlider` — drag white line to reveal before/after
- **Video comparison** → `VideoComparisonSlider` — split-screen with:
  - Synchronized playback (both videos stay in sync)
  - Custom seek bar, play/pause, mute toggle
- **Download button** → `GET /api/enhance/download/:jobId` → `res.download(path, friendlyName)`
- **Expiry modal** — if download clicked after 10 min:
  - Shows "Download Link Expired" dialog
  - "Re-upload & Enhance Again" CTA

---

### 9. Auto-Cleanup (3-layer system)

| Layer | Location | What | When |
|-------|----------|------|------|
| 1 | `server.js` setInterval | Scans `/uploads` + `/outputs`, deletes files > 10 min old | Every 5 min |
| 2 | `enhance.js` setTimeout | Deletes specific output + marks `job.expired = true` | 10 min after job completes |
| 3 | `enhance.js` setInterval | Evicts old completed/errored jobs from in-memory `jobs` object | Every 20 min |

> Layer 3 prevents the `jobs` JavaScript object from growing indefinitely (memory leak prevention).

---

## Design System

### CSS Variables (Theme Tokens) — `index.css`

| Token | Dark | Light |
|-------|------|-------|
| `--glass-bg` | `rgba(255,255,255,0.03)` | `rgba(238,235,255,0.82)` |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(139,92,246,0.2)` |
| `--text-base` | `#f1f5f9` | `#1e1b4b` |
| `--text-muted` | `#94a3b8` | `#4f46e5` |
| `--modal-bg` | `#1e293b` | `#f5f3ff` |

### Tailwind Custom Colors — `tailwind.config.js`

```js
brand:  { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
accent: { 400: '#a78bfa', 500: '#8b5cf6' }
```

### Key CSS Classes

| Class | Effect |
|-------|--------|
| `.glass-card` | Frosted glass card — `backdrop-filter: blur(20px)` |
| `.btn-primary` | Indigo→violet gradient button with hover glow |
| `.btn-success` | Emerald→teal gradient (download button) |
| `.section-enter` | Slide-up + fade-in on new section mount |
| `.shimmer-bar` | Animated white shimmer sweep on progress bar |
| `.drop-zone-active` | Scale + glow when file dragged over |
| `.step-done` | Emerald colour for completed pipeline steps |
| `.step-active` | Pulsing indigo for current step |

---

## App.jsx — State Machine

```
          ┌─────────────────────────────────────────┐
          │                                         │
        'idle'  ←──────────── handleNewFile() ──────┤
          │                                         │
          │ (file uploaded)                          │
          ▼                                         │
       'options'                                    │
          │                                         │
          │ (user clicks Enhance Now)                │
          ▼                                         │
      'processing'  ← SSE events every 500ms        │
          │                                         │
          │ (SSE status === 'complete')              │
          ▼                                         │
       'complete' ───────────────────────────────────┘
```

| State Variable | Purpose |
|---------------|---------|
| `phase` | Current app step |
| `jobId` | Unique UUID shared with backend |
| `fileType` | `'image'` or `'video'` |
| `file` | Raw `File` object (used for `beforeSrc` in comparison) |
| `fileName` | Original filename (for `originalName_enhanced.ext` download) |
| `level` | `'low'` / `'medium'` / `'high'` |
| `theme` | `'dark'` / `'light'` — persisted to `localStorage` |
| `error` | Current error message string |
| `uploadKey` | Bumped to remount `UploadSection` and clear its state |

---

## Backend API Reference

| Method | Endpoint | Request Body / Params | Response |
|--------|----------|----------------------|---------|
| `POST` | `/api/upload` | `multipart/form-data` — field `file` | `{ jobId, fileType, fileName, fileSize }` |
| `POST` | `/api/enhance` | `{ jobId, fileType, level, addWatermark, originalName }` | `{ success, jobId }` |
| `GET`  | `/api/enhance/progress/:jobId` | — | SSE: `{ status, progress, message, elapsed, error }` |
| `GET`  | `/api/enhance/download/:jobId` | — | File stream (or `410 Gone` if expired) |
| `GET`  | `/api/health` | — | `{ status: 'ok', message }` |

---

## Bugs Fixed During This Analysis

| # | File | Bug | Fix Applied |
|---|------|-----|-------------|
| 1 | `frontend/package.json` | Name was `"vite_temp"` (scaffold leftover) | Renamed to `"quickenhance-frontend"` |
| 2 | `App.jsx` | `handleEnhance` missing `fileName` in `useCallback` deps → stale closure | Added `fileName` to dependency array |
| 3 | `middleware/validate.js` | `image/svg+xml` accepted — Sharp **cannot upscale vector graphics** | Removed SVG from `IMAGE_TYPES` |
| 4 | `imageEnhancer.js` | WebP input files saved as JPEG | Added `.webp({ quality: 92, effort: 5 })` output branch |
| 5 | `enhance.js` | In-memory `jobs` store grew forever → memory leak | Added 20-min `setInterval` to evict old jobs |
| 6 | `UploadSection.jsx` | Frontend still accepted `.svg` (mismatch with backend) | Removed SVG from `IMAGE_TYPES` set and `IMAGE_ACCEPT` string |
| 7 | `ComparisonSlider.jsx` | Hardcoded `aspectRatio: 16/9` — portrait/square images were letterboxed | Removed fixed ratio; container uses natural image height |
| 8 | `frontend/.env.example` | File was missing entirely | Created with `VITE_API_BASE=http://localhost:5000` |

---

## How to Run Locally

```powershell
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm install
npm run dev        # uses nodemon — auto-restarts on file changes

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev        # Vite HMR dev server
```

### Environment Variables

```ini
# backend/.env  (copy from backend/.env.example)
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# frontend/.env.local  (copy from frontend/.env.example)
VITE_API_BASE=http://localhost:5000
```

---

## Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Backend | [Render.com](https://render.com) — free Node.js web service | `render.yaml` |
| Frontend | [Vercel](https://vercel.com) — automatic SPA deployment | `frontend/vercel.json` |

> **Important:** Set the `FRONTEND_URL` environment variable in the Render dashboard to your Vercel deployment URL so CORS is correctly configured.
