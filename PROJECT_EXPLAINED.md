# 🚀 QuickEnhance — Project Explained (Bilingual: Hindi + English)

> **File created for learning purpose** — Yeh file tumhare liye ek complete explanation hai ki
> yeh project **kya hai, start se end tak kaise kaam karta hai, aur har file ka kya role hai**.

---

## 📌 Project kya hai? (What is this project?)

**QuickEnhance** ek web application hai jo:
- 📸 **Images** ki quality automatically improve karta hai
- 🎬 **Videos** ki quality automatically improve karta hai
- Bina kisi login/signup ke — completely free
- Server pe sab kuch process hota hai, user ka data save nahi karta
- Files 10 minute baad auto-delete ho jaati hain — full privacy

**Tech Stack:**
| Layer     | Technology Used                          |
|-----------|------------------------------------------|
| Frontend  | React 19 + Vite + Tailwind CSS           |
| Backend   | Node.js + Express.js                     |
| Image AI  | **Sharp** (Lanczos algorithm)            |
| Video AI  | **FFmpeg** (hqdn3d + unsharp filters)   |
| Privacy   | Files auto-delete after 10 minutes       |

---

## 🏗️ Project ka Pura Folder Structure

```
quality_enhancer/
├── backend/
│   ├── server.js               ← Express app entry point (sab setup yahan hota hai)
│   ├── routes/
│   │   ├── upload.js           ← POST /api/upload  — file receive karo
│   │   └── enhance.js          ← POST /api/enhance + SSE progress + download
│   ├── middleware/
│   │   └── validate.js         ← MIME type check + video duration check
│   ├── services/
│   │   ├── imageEnhancer.js    ← Sharp pipeline (asli enhancement logic)
│   │   └── videoEnhancer.js    ← FFmpeg pipeline (asli enhancement logic)
│   ├── uploads/                ← Temp folder: incoming files (auto-delete)
│   ├── outputs/                ← Temp folder: enhanced files (auto-delete)
│   ├── .env.example            ← PORT, FRONTEND_URL, NODE_ENV
│   └── package.json
│
├── frontend/
│   ├── index.html              ← HTML shell + SEO meta tags
│   ├── vite.config.js          ← Vite build config
│   ├── tailwind.config.js      ← brand/accent color palette
│   ├── .env.example            ← VITE_API_BASE
│   └── src/
│       ├── main.jsx            ← React 19 root mount karta hai
│       ├── index.css           ← Design system (CSS vars, glass cards, animations)
│       ├── App.jsx             ← Central brain — state machine
│       └── components/
│           ├── Background.jsx            ← Animated gradient orbs (dark + light mode)
│           ├── Navbar.jsx                ← Logo, "100% Free" badge, theme toggle
│           ├── Hero.jsx                  ← Headline, subtitle, stats row
│           ├── UploadSection.jsx         ← Drag-and-drop file upload + preview
│           ├── OptionsSection.jsx        ← Level selector + watermark toggle
│           ├── ProcessingSection.jsx     ← SSE progress ring + step indicators
│           ├── ResultSection.jsx         ← Timer, download, before/after comparison
│           ├── ComparisonSlider.jsx      ← Image drag-slider (before vs after)
│           ├── VideoComparisonSlider.jsx ← Video split-screen + synchronized controls
│           └── ErrorBanner.jsx           ← Dismissable error strip
│
├── render.yaml                 ← Render.com deployment config (backend)
├── PROJECT_EXPLAINED.md        ← Yeh file!
└── README.md
```

---

## 🏛️ Architecture Overview

```
Browser (React 19 + Vite + Tailwind)
        │
        │  HTTP REST + Server-Sent Events (SSE)
        ▼
Express Backend (Node.js)
    ├── /api/upload                     — Multer se file save karo → jobId return karo
    ├── /api/enhance                    — Sharp/FFmpeg job start karo (async)
    ├── /api/enhance/progress/:jobId    — SSE stream (har 500ms pe progress)
    └── /api/enhance/download/:jobId    — Enhanced file stream karo
        │
        ├── Sharp   → image: Lanczos upscale → denoise → normalize → sharpen → save
        └── FFmpeg  → video: scale → hqdn3d → unsharp/smartblur → eq → H.264
```

---

## 🔄 Complete Data Flow — Start to End

### Step 1️⃣ — User App Open karta hai

```
Browser → index.html load hoti hai
        → Vite React SPA serve karta hai
        → App.jsx initialize hota hai (phase = 'idle')
        → localStorage se theme read hota hai (dark default)
        → Background.jsx animated orbs render karta hai
        → Navbar.jsx logo + theme toggle dikhata hai
```

---

### Step 2️⃣ — File Upload (UploadSection.jsx)

```
User → File drag-drop karta hai ya click karta hai
              ↓
   Client-side validation (validateFile function):
     ✅ MIME type check (IMAGE_TYPES ya VIDEO_TYPES mein hai?)
     ✅ Size check: images ≤ 50 MB, videos ≤ 500 MB
              ↓
   URL.createObjectURL(file) → local preview URL banta hai
              ↓
   FormData POST karo → /api/upload
```

**Backend (routes/upload.js):**
```
Multer middleware:
  → File receive karta hai
  → /uploads/{uuid}.ext mein save karta hai
  → jobId = uuid generate hota hai

validateFileType middleware:
  → Server pe dobara MIME check

Video check:
  → ffprobe se duration padho
  → 60 seconds se zyada? → file delete karo + 400 error

Response:
  → { jobId, fileType, fileName, fileSize }
```

**App.jsx:** `jobId`, `fileType`, `fileName`, `file` save hote hain → `phase = 'options'`

---

### Step 3️⃣ — Options Select (OptionsSection.jsx)

```
[OptionsSection] dikhata hai:
  ○ Low    (1.5× upscale · ~30s)
  ● Medium (2×   upscale · ~60s)   ← Default
  ○ High   (3×   upscale · ~2-3min)
  □ Add Watermark (optional)
              ↓
  "Enhance Now" click
              ↓
  App.jsx → handleEnhance() call hota hai
              ↓
  POST /api/enhance
  Body: { jobId, fileType, level: "medium", addWatermark: false, originalName: "photo.jpg" }
              ↓
  phase = 'processing'
```

---

### Step 4️⃣ — Enhancement Job Start (routes/enhance.js)

```
Backend:
  1. /uploads/ mein jobId se file dhundho
  2. Output path banao: /outputs/enhanced_{jobId}.ext
  3. downloadName banao: "photo_enhanced.jpg" (user-friendly naam)
  4. jobs[jobId] = { status: 'processing', progress: 0, ... }
  5. TURANT response bhejo: { success: true }  ← SSE connect ho sake isliye
  6. Background mein async IIFE chalaao:
     ├── Image? → imageEnhancer.enhanceImage() call karo
     └── Video? → videoEnhancer.enhanceVideo() call karo
  7. Complete hone pe:
     ├── jobs[jobId].status = 'complete'
     ├── Input file delete karo
     └── 10 minute baad output bhi delete ho jaayega (setTimeout)
```

---

### Step 5️⃣ — Real-time Progress (ProcessingSection.jsx + SSE)

```
ProcessingSection:
  → new EventSource('/api/enhance/progress/{jobId}') kholta hai

Backend har 500ms pe event bhejta hai:
  data: {"status":"processing","progress":30,"message":"Applying sharpening...","elapsed":8}
  data: {"status":"processing","progress":60,"message":"Enhancing brightness & colors...","elapsed":15}
  data: {"status":"processing","progress":90,"message":"Saving enhanced image...","elapsed":20}
  data: {"status":"complete","progress":100,"elapsed":22}

UI update hota hai:
  ├── Circular progress ring (SVG stroke-dashoffset)
  ├── Progress bar (shimmer animation)
  ├── Step indicators (Upload → Analyze → Enhance → Finalize)
  └── ETA calculation

status === 'complete' → SSE close → onComplete() → phase = 'complete'
```

**SSE kya hai?** Server-Sent Events — ek HTTP connection jisme server continuously data bhejta hai.
WebSocket se simpler — sirf server → client, ek direction.

---

### Step 6️⃣ — Image Enhancement Pipeline (imageEnhancer.js)

Sharp library use hoti hai (C++ ke upar bani — bahut fast):

| Step | Action | Code |
|------|--------|------|
| 1 | Metadata read | `sharp(input).metadata()` |
| 2 | **Lanczos3 Upscale** | `.resize(W, H, { kernel: 'lanczos3' })` |
| 3 | Median denoise | `.median(3 ya 5)` |
| 4 | Auto-level | `.normalise()` |
| 5 | Color boost | `.modulate({ brightness, saturation })` |
| 6 | Sharpen | `.sharpen({ sigma, flat, jagged })` |
| 7 | Optional watermark | `.composite([{ input: svgBuffer }])` |
| 8 | Save | `.jpeg(95)` / `.png(100)` / `.webp(92)` |

**Enhancement Presets:**
| Level | Scale | Sharpen | Denoise | Brightness |
|-------|-------|---------|---------|------------|
| Low   | 1.5×  | Light   | None    | +2%        |
| Medium| 2×    | Moderate| 3px     | +5%        |
| High  | 3×    | Strong  | 5px     | +8%        |

Max output dimension: **6000px** (i5 laptop protect karne ke liye auto-clamp)

---

### Step 7️⃣ — Video Enhancement Pipeline (videoEnhancer.js)

FFmpeg filters ka chain use hota hai:

| Filter | Kya karta hai |
|--------|---------------|
| `scale=W:H:flags=lanczos` | Upscale with Lanczos (max 1920×1080) |
| `hqdn3d` | 3D temporal+spatial denoise (compression artifacts hataao) |
| `unsharp` | Luma-only sharpening (colors natural raho) |
| `smartblur` | Edge-aware micro-noise smoothing (hair strands protect karo) |
| `eq` | Contrast/saturation/gamma — **brightness=0 (boost nahi!)** |
| `drawtext` | Optional ⚡ watermark (0.28 opacity — barely visible) |
| Audio | `loudnorm,highpass=f=80` — normalize + low rumble hataao |
| Output | H.264 CRF 18-22 + AAC 128k + `-movflags +faststart` |

**Video Presets:**
| Level | Scale | CRF | Preset | Denoise |
|-------|-------|-----|--------|---------|
| Low   | 1.5×  | 22  | fast   | Light   |
| Medium| 2×    | 20  | medium | Moderate|
| High  | 2×    | 18  | slow   | Strong  |

> ⚠️ Video HIGH level bhi 2× tak hi rakhha — 3× pe i5 pe OOM ho sakta tha

---

### Step 8️⃣ — Result Section (ResultSection.jsx)

```
"Enhancement Complete!" dikhata hai
              ↓
10-minute countdown timer:
  > 3 min  → green (normal)
  1-3 min  → amber (warning)
  < 1 min  → red + pulse (urgent!)
              ↓
Before/After Comparison:
  Image → ComparisonSlider (white line drag karo)
  Video → VideoComparisonSlider (split-screen + synchronized playback)
              ↓
Download button:
  → GET /api/enhance/download/{jobId}
  → res.download(outputPath, "photo_enhanced.jpg")
  → Browser download prompt
              ↓
File expire hone pe:
  → Modal popup: "Download Link Expired"
  → "Re-upload & Enhance Again" button
```

---

### Step 9️⃣ — Auto Cleanup

| Where | Kya delete karta hai | Kab |
|-------|----------------------|-----|
| `server.js` setInterval | `/uploads` + `/outputs` mein 10+ min old files | Har 5 min |
| `enhance.js` setTimeout | Specific output file (us job ki) | 10 min after completion |
| `enhance.js` setInterval | Old `jobs` in-memory entries (completed/expired) | Har 20 min |

---

## 📱 App.jsx — State Machine (Central Brain)

```
          ┌─────────────────────────────────────────┐
          │                                         │
        'idle'  ←──────────── handleNewFile() ──────┤
          │                                         │
          │ (file uploaded successfully)             │
          ▼                                         │
       'options'                                    │
          │                                         │
          │ (user clicks "Enhance Now")              │
          ▼                                         │
      'processing'  ← SSE events har 500ms          │
          │                                         │
          │ (SSE status === 'complete')              │
          ▼                                         │
       'complete' ───────────────────────────────────┘
```

**State variables:**
| Variable | Kya store karta hai |
|----------|---------------------|
| `phase` | Current step: idle/options/processing/complete |
| `jobId` | Backend ke saath unique identifier |
| `fileType` | "image" ya "video" |
| `file` | Raw File object (before preview ke liye) |
| `fileName` | Original file ka naam (download naming ke liye) |
| `level` | "low" / "medium" / "high" |
| `theme` | "dark" / "light" (localStorage mein persist) |
| `error` | Current error message (ErrorBanner ke liye) |

---

## 🎨 Design System (index.css + tailwind.config.js)

### CSS Variables (Theme Tokens)
| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--glass-bg` | `rgba(255,255,255,0.03)` | `rgba(238,235,255,0.82)` |
| `--text-base` | `#f1f5f9` (near-white) | `#1e1b4b` (deep indigo) |
| `--text-muted` | `#94a3b8` | `#4f46e5` (indigo) |
| `brand-500` | `#6366f1` (indigo) | same |
| `accent-500` | `#8b5cf6` (violet) | same |

### CSS Classes
| Class | Kya karta hai |
|-------|---------------|
| `.glass-card` | Frosted glass effect (`backdrop-filter: blur(20px)`) |
| `.btn-primary` | Indigo→violet gradient button with glow on hover |
| `.btn-success` | Emerald→teal gradient (download button) |
| `.section-enter` | Slide-up + fade-in animation (new sections ke liye) |
| `.shimmer-bar` | Animated white shimmer on progress bar |
| `.drop-zone-active` | Drag hover state (scale + glow) |
| `.step-done` | Green color for completed steps |
| `.step-active` | Pulsing indigo for current step |

### Animations
| Animation | Kya karta hai |
|-----------|---------------|
| `float` | Hero badge upar-neeche drift karta hai |
| `pulse-slow` | Background orbs slowly pulse karte hain |
| `shimmer` | Progress bar pe light sweep |
| `orb-drift-1/2/3/4` | Light mode orbs ka unique path |
| `sectionEnter` | New section appear hone ka animation |

---

## 🛠️ Backend API Reference

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/api/upload` | `multipart/form-data` (file) | `{ jobId, fileType, fileName, fileSize }` |
| POST | `/api/enhance` | `{ jobId, fileType, level, addWatermark, originalName }` | `{ success, jobId }` |
| GET | `/api/enhance/progress/:id` | — | SSE stream of `{ status, progress, message, elapsed }` |
| GET | `/api/enhance/download/:id` | — | File download stream |
| GET | `/api/health` | — | `{ status: 'ok' }` |

---

## 🔬 2×–3× Resolution Boost kya hai?

> **"Resolution Boost" matlab image ke pixels ko mathematically multiply karke uski size aur clarity badhana."**

Agar image **500×400 pixels** hai:

| Level  | Scale | Output Size      |
|--------|-------|-----------------|
| 🟢 Low   | 1.5× | 750×600 pixels  |
| 🟡 Medium| 2×   | 1000×800 pixels |
| 🔴 High  | 3×   | 1500×1200 pixels|

**Lanczos kya hai?** Ek mathematical filter jo naye pixels **interpolate** karta hai — aas-paas ke 6 pixels ka weighted average lekar smooth, sharp result deta hai. Bilinear ya bicubic se bahut better quality.

---

## 🐛 Bugs Fixed (Analysis ke Dauran)

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `frontend/package.json` | Name `"vite_temp"` tha (scaffold leftover) | `"quickenhance-frontend"` kiya |
| 2 | `App.jsx` | `handleEnhance` mein `fileName` missing tha dep array se (stale closure) | `fileName` add kiya |
| 3 | `validate.js` | `image/svg+xml` accept ho raha tha — Sharp SVG upscale **nahi** kar sakta | SVG remove kiya |
| 4 | `imageEnhancer.js` | WebP files JPEG ke roop mein save ho rahi thi | `.webp({ quality: 92 })` branch add kiya |
| 5 | `enhance.js` | `jobs` object forever grow karta tha — memory leak | 20-min interval se old jobs delete kiye |
| 6 | `UploadSection.jsx` | Frontend SVG accept kar raha tha (backend se mismatch) | `.svg` removed |
| 7 | `ComparisonSlider.jsx` | Hardcoded `16/9` aspect ratio — portrait images letterbox ho jaati thi | Natural image dimensions use kiye |
| 8 | `frontend/.env.example` | Missing tha | `VITE_API_BASE` ke saath create kiya |

---

## ⚙️ Performance Optimizations (i5 Laptop ke liye)

1. **Image max 6000px** — bahut badi images ke liye auto-clamp
2. **Video max 1920×1080** — Full HD tak hi process karo
3. **Video HIGH = 2× (not 3×)** — memory overload se bachne ke liye
4. **FFmpeg preset:** Low=`fast`, Medium=`medium`, High=`slow` — speed vs quality tradeoff
5. **Background async processing** — server block nahi hota, multiple requests handle kar sakta hai
6. **No brightness boost in video** — `brightness=0` — overexposed look avoid karta hai

---

## 🚀 Local Development

```powershell
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # nodemon → http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # Vite → http://localhost:5173
```

**Environment variables:**
```
# backend/.env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# frontend/.env.local
VITE_API_BASE=http://localhost:5000
```

---

## 🌐 Deployment

| Service | Platform | Config file |
|---------|----------|-------------|
| Backend | Render.com (free tier) | `render.yaml` |
| Frontend | Vercel | `frontend/vercel.json` |

> ⚠️ Production pe `FRONTEND_URL` Render dashboard mein manually set karo (Vercel URL se)

---

*Happy coding! 🚀 — Yeh project ek complete full-stack AI enhancement pipeline demonstrate karta hai.*
