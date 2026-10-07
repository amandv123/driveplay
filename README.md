<div align="center">

# ▶ DRIVEPLAY

### **A Better Way to Watch.**

A fast, focused, and modern web video player for **Google Drive videos you own or are authorized to access**.

<br />

[![Status](https://img.shields.io/badge/status-in%20development-black?style=for-the-badge)](https://github.com/amandv123/driveplay)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-fast-F7DF1E?style=for-the-badge&logo=vite&logoColor=111111)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br />

**[Overview](#-overview) · [Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [Roadmap](#-roadmap) · [Contributing](#-contributing)**

</div>

---

## 🎬 Overview

Google Drive is excellent at **storing and sharing** video files.

DrivePlay is being built around a different idea:

> **What if watching a Drive video felt more like using a real media player?**

DrivePlay combines cloud-hosted video with a purpose-built playback experience focused on:

- smooth playback
- responsive controls
- mobile-friendly interaction
- reliable seeking
- performance
- a clean, distraction-free interface

The project begins with Google Drive and is intentionally designed so the playback engine can later support additional media providers.

---

## ✨ Features

### Available now

- 🔗 Google Drive URL parsing
- 🆔 Automatic Drive file ID extraction
- 🧩 Provider-independent media resolver foundation
- ▶ Native HTML5 playback probe
- 📱 Responsive black-and-white UI foundation
- ⚡ Vite + TypeScript production build
- 🛡️ Authorized-content-first architecture

### Coming next

- 🔐 Google OAuth / Drive API integration
- 📡 Reliable media delivery
- ⏩ Range-based seeking
- 🎛️ Custom player controls
- 🔊 Volume and mute
- ⏪ 5 / 10 second rewind & forward
- 🐇 0.25×–3× playback speed
- ✋ Press-and-hold **2×** speed boost
- 💬 Subtitle support
- 🎧 Audio track selection
- 🖥️ Fullscreen & theater mode
- 📺 Picture-in-Picture
- 💾 Resume playback
- 📱 Mobile gestures
- 🎞️ Quality selection when supported by the source

> **Note:** The current Google Drive download resolver is a development-only implementation. It is not the final streaming architecture.

---

## 🖥️ Preview

> The interface is intentionally minimal while the underlying media pipeline is being engineered.

<div align="center">

**DrivePlay — current foundation**

</div>

The player UI will become the visible layer on top of a more robust media pipeline once Google Drive playback is fully validated.

---

## 🧠 Why DrivePlay?

Most cloud storage services are optimized for **file management**, not for delivering a dedicated viewing experience.

DrivePlay focuses on the last mile:

**Paste → Resolve → Play → Control → Watch**

The project is deliberately being built in that order: reliable media delivery first, premium player experience second.

---

## 🏗️ Architecture

DrivePlay separates **where media comes from** from **how the media is played**.

```text
┌──────────────────────┐
│     Google Drive     │
│      share URL       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   URL / File ID      │
│       Parser         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Media Resolver    │
│                      │
│  Google Drive        │
│  Future providers    │
│  Direct sources      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Authorized Media    │
│      Delivery        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Native HTML5       │
│       Video          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    DrivePlay UI      │
└──────────────────────┘
```

This separation keeps the player independent from provider-specific delivery logic and makes future integrations much easier.

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React |
| Language | TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Icons | Lucide React |
| Playback | Native HTML5 Media APIs |
| Subtitles | WebVTT |
| Backend / media layer | Cloudflare Workers |
| Source control | Git + GitHub |

### Design principles

- **Native before unnecessary abstraction**
- **Performance before visual complexity**
- **Small dependency surface**
- **Provider-independent media layer**
- **Authorized access only**
- **Progressive enhancement**
- **Mobile-first interaction**

---

## 📦 Project Structure

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

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **npm**
- A modern browser

### Clone

```bash
git clone https://github.com/amandv123/driveplay.git
cd driveplay
```

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

---

## ⚡ Performance

Performance is a product requirement.

DrivePlay is being designed to:

- prefer native browser playback
- minimize unnecessary React re-renders
- isolate high-frequency playback state
- keep the player bundle lean
- avoid unnecessary transcoding
- handle long videos without avoidable memory growth
- make seeking and buffering first-class states
- remain usable on realistic mobile hardware

A feature is not considered finished merely because it works. It should also behave well under real playback conditions.

---

## 🔐 Security & Privacy

DrivePlay is intended for **user-owned or otherwise authorized content**.

Private Google Drive media will use Google's supported authorization mechanisms. The project will not attempt to bypass:

- Drive permissions
- authentication
- access controls
- sharing restrictions

Never commit API keys, OAuth secrets, access tokens, or other credentials to the repository.

---

## 🗺️ Roadmap

### Phase 01 — Media Pipeline

- [x] Project foundation
- [x] Drive URL parsing
- [x] File ID extraction
- [x] Media resolver abstraction
- [x] Native playback probe
- [ ] Google Drive API integration
- [ ] Google authorization flow
- [ ] Reliable media endpoint
- [ ] HTTP Range support
- [ ] Seeking validation
- [ ] Error / recovery strategy

### Phase 02 — Premium Player

- [ ] Custom controls
- [ ] Seek controls
- [ ] Playback speed
- [ ] Temporary 2× hold
- [ ] Volume / mute
- [ ] Keyboard shortcuts
- [ ] Fullscreen
- [ ] Theater mode
- [ ] Picture-in-Picture

### Phase 03 — Media Features

- [ ] Subtitles
- [ ] Audio tracks
- [ ] Quality selection
- [ ] Resume playback
- [ ] File information
- [ ] Custom thumbnails

### Phase 04 — Performance & Reliability

- [ ] Mobile gestures
- [ ] Buffering states
- [ ] Retry / recovery
- [ ] Long-video testing
- [ ] Cross-browser testing
- [ ] Performance profiling

### Phase 05 — Production

- [ ] Accessibility review
- [ ] Security review
- [ ] Production deployment
- [ ] Monitoring
- [ ] Documentation
- [ ] DriveClone integration

---

## 🧭 Development Philosophy

DrivePlay is deliberately being built **pipeline-first**.

That means:

```text
Reliable media
      ↓
Reliable playback
      ↓
Premium controls
      ↓
Mobile UX
      ↓
Production polish
```

Fancy UI cannot compensate for an unreliable media source.

The player will therefore be built on a stable playback foundation rather than hiding media-delivery problems behind a polished interface.

---

## 🤝 Contributing

DrivePlay is currently in active development and the internal APIs may change.

Before opening a pull request:

1. explain the problem or feature
2. keep changes focused
3. run `npm run build`
4. avoid introducing unnecessary dependencies
5. never include credentials or private media URLs

Bug reports, architecture feedback, and focused improvements are welcome.

---

## 📌 Project Status

| Area | Status |
| --- | --- |
| Project foundation | ✅ Ready |
| UI foundation | ✅ Ready |
| Drive URL parsing | ✅ Ready |
| Media resolver | 🟡 In development |
| Google Drive API | 🟡 Planned next |
| Playback pipeline | 🟡 In development |
| Premium player | ⚪ Planned |
| Mobile gestures | ⚪ Planned |
| Production release | ⚪ Future |

---

## 📄 License

DrivePlay is currently under active development. License information will be added before the first stable public release.

---

<div align="center">

### **DrivePlay**
**A Better Way to Watch.**

Built for better playback.

<br />

[GitHub](https://github.com/amandv123/driveplay)

</div>
