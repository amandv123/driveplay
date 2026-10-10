<div align="center">

# ▶ DRIVEPLAY

### **A Better Way to Watch.**

**Turn a Google Drive video link into a focused, modern playback experience.**

<br />

[![Status](https://img.shields.io/badge/status-active%20development-111111?style=for-the-badge)](https://github.com/amandv123/driveplay)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br />

**[Overview](#-overview) · [Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Roadmap](#-roadmap)**

</div>

---

## 🎬 Overview

Google Drive is built primarily for **storage, sharing, and file management**.

**DrivePlay is built for watching.**

Paste a Google Drive video link and, once the media pipeline is fully connected, DrivePlay will turn it into a dedicated viewing experience with a fast, clean interface and player controls designed around real-world playback.

> **Drive storage on the backend. Media-player experience on the frontend.**

The project is being built **pipeline-first**: reliable media delivery comes before visual complexity.

---

## ✨ What DrivePlay Is Trying to Solve

A normal cloud-storage video experience often means:

- limited playback controls
- inconsistent seeking
- poor mobile interaction
- unnecessary UI around the video
- little control over subtitles, speed, or playback state

DrivePlay focuses on the actual viewing experience:

```
Paste Link
    ↓
Resolve Media
    ↓
Authorize Access
    ↓
Deliver Media
    ↓
Native Playback
    ↓
Premium Controls
```

---

## 🚀 Features

### 🎥 Playback

- Native HTML5 video playback
- Smooth seeking for supported media sources
- Play / pause
- 5 / 10 second rewind & forward
- Volume / mute
- Playback speed from **0.25× to 3×**
- Temporary **2× speed** while holding the player
- Resume playback position
- Fullscreen
- Theater / cinema mode
- Picture-in-Picture
- Keyboard shortcuts
- Mobile gestures

### 💬 Media Features

- SRT / WebVTT subtitles
- Subtitle size, position and opacity controls
- Subtitle timing offset
- Audio-track selection when exposed by the source
- Quality selection when multiple qualities are available
- Custom thumbnail
- Video / file information

### 🛡️ Reliability

- Loading and buffering states
- Retry / recovery handling
- Long-video testing
- Cross-browser validation
- Performance profiling
- Provider-independent media resolution

> **Important:** Some features above are part of the planned player. They are listed here to define the target product, not to imply that every feature is already production-ready.

---

## 🖥️ Current UI

The current interface is intentionally minimal: black canvas, high-contrast controls, responsive layout, and no unnecessary visual noise.

A real product screenshot / demo GIF will be added here once the playback pipeline is stable.

> **Next visual milestone:** replace this section with an actual DrivePlay player screenshot and a short playback demo.

---

## 🧠 Product Principles

| Principle | Meaning |
| --- | --- |
| **Performance first** | Playback quality matters more than decorative UI |
| **Native first** | Prefer browser media capabilities before adding heavy abstractions |
| **Pipeline first** | Resolve and deliver media reliably before polishing controls |
| **Mobile first** | Touch interaction is a first-class requirement |
| **Provider independent** | Keep media resolution separate from player logic |
| **Authorized access only** | Never bypass Drive permissions or authentication |
| **Small by default** | Avoid unnecessary dependencies and client-side work |

---

## 🏗️ Architecture

DrivePlay separates **media acquisition** from **media playback**.

```text
┌─────────────────────────┐
│      Google Drive       │
│        Share URL        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      URL Parser         │
│     File ID Extractor   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│     Media Resolver      │
│                         │
│  Google Drive           │
│  Future providers       │
│  Direct media sources   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Authorized Delivery   │
│   Range / Seek Support  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Native Media Engine   │
│        <video>          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      DrivePlay UI       │
│ Controls · Gestures     │
│ Subtitles · PiP · UX    │
└─────────────────────────┘
```

This architecture allows the player to remain largely independent of the storage provider.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Icons | Lucide React |
| Playback | Native HTML5 Media APIs |
| Subtitles | WebVTT |
| Media / Edge Layer | Cloudflare Workers |
| Source Control | Git + GitHub |

### Why this stack?

**React + TypeScript** keeps the UI structured and strongly typed.

**Vite** keeps local development and production builds fast.

**Native media APIs** avoid adding a heavy playback framework where the browser already provides the required primitives.

**Zustand** is reserved for application/player state that should not cause unnecessary component-wide re-renders.

**Cloudflare Workers** provides a natural place for provider-specific media resolution and edge delivery logic.

---

## 📁 Project Structure

```text
driveplay/
├── docs/
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
│
├── src/
│   ├── components/
│   │   ├── DriveInput.tsx
│   │   └── VideoProbe.tsx
│   │
│   ├── lib/
│   │   ├── googleDrive.ts
│   │   ├── googleDriveResolver.ts
│   │   └── mediaResolver.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## ⚡ Performance

Performance is not a later optimization. **It is part of the product definition.**

DrivePlay is being engineered to:

- keep the playback engine independent from high-frequency React rendering
- minimize unnecessary state updates
- prefer browser-native decoding and playback
- avoid unnecessary client-side transcoding
- support efficient seeking through HTTP Range-capable delivery
- handle long videos without avoidable memory growth
- provide explicit loading, buffering and recovery states
- remain usable on realistic mobile hardware

A feature is not considered complete simply because it works once.

It must also behave correctly during **seeking, buffering, pause/resume, long playback sessions, mobile interaction, and recovery from transient failures**.

---

## 🔐 Security & Privacy

DrivePlay is intended for **videos the user owns or is authorized to access**.

Private Drive files will use Google's supported authentication and authorization mechanisms.

DrivePlay will not attempt to bypass:

- Google Drive permissions
- authentication
- sharing restrictions
- access controls

### Credential rule

Never commit:

- OAuth client secrets
- API keys
- access tokens
- private media URLs
- service-account credentials

Use environment variables for development secrets.

---

## 🚧 Current Development Status

| Component | Status |
| --- | --- |
| Project foundation | ✅ Complete |
| Responsive UI foundation | ✅ Complete |
| Drive URL parsing | ✅ Complete |
| File ID extraction | ✅ Complete |
| Media resolver abstraction | ✅ Complete |
| Native playback probe | ✅ Complete |
| Google Drive API integration | 🔜 Next |
| Authorized media delivery | 🔜 Next |
| HTTP Range / seeking | 🔜 Next |
| Custom player controls | ⏳ Planned |
| Subtitles / audio tracks | ⏳ Planned |
| Mobile gestures | ⏳ Planned |
| Production deployment | ⏳ Planned |

**Current focus:** make Google Drive media playback actually reliable before expanding the player feature set.

---

## 🗺️ Roadmap

### Phase 01 — Media Pipeline

- [x] Project foundation
- [x] Drive URL parser
- [x] File ID extraction
- [x] Resolver abstraction
- [x] Native playback probe
- [ ] Google Drive API integration
- [ ] Google authorization
- [ ] Reliable media endpoint
- [ ] HTTP Range support
- [ ] Seek validation
- [ ] Error and recovery strategy

### Phase 02 — Premium Player

- [ ] Custom controls
- [ ] 5 / 10 second seeking
- [ ] 0.25×–3× speed
- [ ] Hold-for-2× interaction
- [ ] Volume / mute
- [ ] Keyboard shortcuts
- [ ] Fullscreen
- [ ] Theater mode
- [ ] Picture-in-Picture

### Phase 03 — Media Experience

- [ ] SRT / WebVTT subtitles
- [ ] Subtitle styling
- [ ] Subtitle timing offset
- [ ] Audio-track selection
- [ ] Quality selection
- [ ] Resume playback
- [ ] File information
- [ ] Custom thumbnail

### Phase 04 — Reliability

- [ ] Mobile gestures
- [ ] Buffering UX
- [ ] Retry / recovery
- [ ] Long-video testing
- [ ] Cross-browser testing
- [ ] Performance profiling
- [ ] Accessibility review

### Phase 05 — Production

- [ ] Production deployment
- [ ] Monitoring
- [ ] Security review
- [ ] Documentation
- [ ] Public release
- [ ] DriveClone integration

---

## 🚀 Getting Started

### Requirements

- **Node.js 20+**
- **npm**
- Modern Chromium, Firefox, Safari, or equivalent browser

### 1. Clone

```bash
git clone https://github.com/amandv123/driveplay.git
cd driveplay
```

### 2. Install

```bash
npm install
```

### Configure Google Drive playback

Create a Google OAuth **Web application** client ID with the Google Identity Services token flow enabled and the Drive API available. Copy `.env.example` to `.env.local`, then set:

- `VITE_GOOGLE_CLIENT_ID` to your OAuth client ID.
- `VITE_MEDIA_API_URL` to the deployed `driveplay-media` Worker URL.

Configure the Cloudflare Worker before testing playback:

```bash
npx wrangler secret put STREAM_ENCRYPTION_SECRET
```

Use a randomly generated secret with at least 32 characters. In the Worker environment, set `ALLOWED_ORIGINS` to the comma-separated exact origins of your deployed frontend (for local development, `http://localhost:5173` and `http://127.0.0.1:5173` are already allowed). Never put the Worker secret in `.env.local` or commit it.

When a user submits a link, DrivePlay requests Google Drive read-only authorization and creates a short-lived, encrypted playback ticket. The ticket lets the native video element make Range requests for seeking without putting the raw Google OAuth token in the URL. The file must be accessible to the authorized Google account and downloadable under Drive permissions; this does not bypass sharing restrictions. Browser codec support still determines which media formats can play.

### 3. Start development

```bash
npm run dev
```

### 4. Build

```bash
npm run build
```

### 5. Preview production build

```bash
npm run preview
```

---

## 🤝 Contributing

DrivePlay is currently under active development.

Before opening a pull request:

1. Keep the change focused.
2. Run `npm run build`.
3. Avoid unnecessary dependencies.
4. Do not commit credentials or private media URLs.
5. Explain the problem your change solves.

Architecture, performance, accessibility, and playback reliability improvements are especially valuable.

---

## 📄 License

DrivePlay is currently under active development. License information will be added before the first stable public release.

---

<div align="center">

## ▶ DRIVEPLAY

### **A Better Way to Watch.**

**Paste. Resolve. Play.**

<br />

[**View Repository →**](https://github.com/amandv123/driveplay)

</div>
