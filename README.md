# QualityEnhancer — Photo & Video Enhancer

> 🚀 **100% Free** — No login, no cost, no data storage.  
> Built with Node.js, Sharp, and FFmpeg. Works great!

---

## 📁 Project Structure

```
quality_enhancer/
├── frontend/                  ← HTML + CSS + JS (deploy to Vercel)
│   ├── index.html
│   ├── css/styles.css 
│   └── js/
│       ├── app.js
│       ├── uploader.js
│       ├── processor.js
│       └── comparison.js
│
├── backend/                   ← Node.js API (deploy to Render.com)
│   ├── server.js
│   ├── routes/
│   │   ├── upload.js
│   │   └── enhance.js
│   ├── services/
│   │   ├── imageEnhancer.js   ← Sharp (Lanczos upscaling)
│   │   └── videoEnhancer.js   ← FFmpeg processing
│   ├── middleware/
│   │   └── validate.js
│   ├── uploads/               ← Temp (auto-deleted)
│   ├── outputs/               ← Temp (auto-deleted)
│   └── package.json
│
├── render.yaml                ← Render.com deploy config
├── vercel.json                ← Vercel deploy config
└── README.md
```

---

## ⚙️ Installation (Local)

### Prerequisites
- Node.js 18+ → https://nodejs.org
- No Python, no GPU, no extra installs needed!

### 1. Install Backend

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
# Copy example env
cp .env.example .env

# backend/.env contents:
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Start Backend

```bash
# Development (auto-restart on changes)
npm run dev

# OR production
npm start
```

Backend runs at: http://localhost:5000

### 4. Run Frontend

The frontend is pure _vite + react_ just open it in a browser or serve it:

**Option A — Development mode (recommended)**
```bash
cd frontend
npm install   # run once
npm run dev
```


**Option B — Production build**
```bash
# cd frontend
npm run build
npm run preview
```
build → creates optimized production files
preview → serves them locally

---

## 🌐 Free Deployment (Step-by-Step)

### Backend → Render.com (Free)

1. Push code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:** `FRONTEND_URL=https://your-vercel-url.vercel.app`
5. Click **Deploy**
6. Copy your Render URL (e.g. `https://QualityEnhancer.onrender.com`)

### Frontend → Vercel (Free)

1. Go to https://vercel.com → New Project → Import GitHub repo
2. Set **Root Directory:** `frontend`
3. No build command needed
4. Before deploying, update `API_BASE` in `frontend/js/app.js`:
   ```js
   export const API_BASE = 'https://QualityEnhancer.onrender.com';
   ```
5. Click **Deploy**

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🖼️ Image Enhancement | Upscale 1.5×–3×, sharpen, denoise, normalize |
| 🎬 Video Enhancement | Upscale, hqdn3d denoise, unsharp, EQ filters |
| 📊 Real-time Progress | SSE progress bar + ring + step indicators |
| 🔀 Before/After Slider | Interactive drag comparison |
| 🌙 Dark/Light Mode | Persisted in localStorage |
| 🏷️ Watermark Toggle | Optional "Enhanced by QualityEnhancer" overlay |
| ⚡ Enhancement Levels | Low / Medium / High |
| 🔒 Privacy | Files auto-deleted after 10 minutes |
| 📱 Responsive | Mobile + Desktop |

---

## 🛠️ Tech Stack (All Free)

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + Tailwind CDN |
| Backend | Node.js + Express |
| Image | Sharp (Lanczos algorithm) |
| Video | FFmpeg via ffmpeg-static |
| Progress | Server-Sent Events (SSE) |
| Frontend Host | Vercel (free) |
| Backend Host | Render.com (free) |

---

## 📋 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/upload` | POST | Upload file (multipart) |
| `/api/enhance` | POST | Start enhancement |
| `/api/enhance/progress/:jobId` | GET | SSE progress stream |
| `/api/enhance/download/:jobId` | GET | Download result |
| `/outputs/:filename` | GET | Serve output file |

---

## ⚠️ Limitations (Free Tier)

- Render.com free tier spins down after 15 min inactivity (first request may take ~30s to wake up)
- Video processing is CPU-only (i5 is fine for 720p/1080p videos up to 60s)
- Max video: 60 seconds, 500MB
- Max image: 50MB

---

## 🔧 Troubleshooting

**Backend not starting?**
```bash
# Make sure Node 18+
node --version

# Reinstall
cd backend && rm -rf node_modules && npm install
```

**FFmpeg errors?**
- The `ffmpeg-static` package bundles FFmpeg — no system install needed
- On Windows, make sure `node_modules` is not inside a path with spaces

**CORS errors?**
- Set `FRONTEND_URL` in `backend/.env` to your exact frontend URL
