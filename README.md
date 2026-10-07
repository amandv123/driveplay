# DrivePlay

> **A Better Way to Watch.**

DrivePlay is a modern, performance-focused web video player designed to make cloud-hosted video feel more like a dedicated media player.

The project starts with **Google Drive video playback for content the user owns or is authorized to access**, with a long-term goal of providing a polished, fast, and consistent viewing experience across desktop and mobile.

---

## ✨ Vision

Google Drive is excellent for storing and sharing videos, but its built-in viewing experience is intentionally simple.

DrivePlay aims to bridge that gap:

**Cloud storage simplicity + dedicated-player control.**

The goal is not to recreate a storage platform. It is to build a focused video experience around reliable playback, smooth controls, and performance.

---

## 🚧 Project Status

**Early development — media pipeline foundation**

The current priority is validating reliable Google Drive media access and browser playback before building the complete custom player.

### Current foundation

- Google Drive URL parsing
- Drive file ID extraction
- Media resolver architecture
- Native HTML5 video playback probe
- Loading, playback, and error states
- Responsive black-and-white visual foundation
- Production TypeScript/Vite build
- Performance-oriented architecture

### In progress

- Google Drive API integration
- Authorized Google account access
- Reliable media delivery
- HTTP Range / seeking support
- Production-grade playback pipeline

> The current Google Drive download URL is a temporary development resolver and is **not considered the final streaming architecture**.

---

## 🎬 Planned Player Experience

Once the media pipeline is stable, DrivePlay will evolve toward a full-featured player.

### Playback

- Play / pause
- Seek bar
- 5 / 10 second rewind and forward
- Volume and mute
- Playback speed from **0.25× to 3×**
- Press-and-hold **2× speed boost**
- Resume from the previous position
- Smooth long-video seeking

### Display

- Fullscreen
- Picture-in-Picture
- Theater / cinema mode
- Custom thumbnails
- Responsive desktop and mobile layouts
- Clean distraction-free interface

### Subtitles

- WebVTT support
- SRT support where conversion is appropriate
- Subtitle size controls
- Subtitle position
- Opacity controls
- Timing offset

### Media

- Audio track selection when exposed by the source
- Quality selection when multiple qualities are available
- Video metadata and file information
- Buffering and connection feedback

### Mobile

- Touch-friendly controls
- Swipe gestures
- Press-and-hold 2× playback
- Responsive player controls
- Mobile-first interaction design

---

## 🧠 Architecture

DrivePlay is being designed around a provider-independent media layer so the player UI does not need to know where the video comes from.

```text
User
 │
 ▼
Drive URL
 │
 ▼
URL / File ID Parser
 │
 ▼
Media Resolver
 │
 ├── Google Drive
 │
 ├── Future providers
 │
 └── Direct media sources
 │
 ▼
Authorized Media Delivery
 │
 ▼
Native HTML5 Video
 │
 ▼
DrivePlay Player
```

This separation allows the playback engine and UI to evolve independently from the media provider.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| React | UI architecture |
| TypeScript | Type safety |
| Vite | Development and production tooling |
| Tailwind CSS | UI styling |
| Zustand | Lightweight application state |
| Lucide React | Interface icons |
| HTML5 Media APIs | Native browser playback |
| WebVTT | Subtitle support |
| Cloudflare Workers | Backend / media-resolution layer where required |
| GitHub | Source control and CI/CD |

The stack is intentionally lightweight. Dependencies are added only when they provide a clear benefit to playback, reliability, or maintainability.

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
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🚀 Local Development

### Requirements

- Node.js 20+
- npm
- A modern Chromium, Firefox, or Safari browser

### Install

```bash
git clone https://github.com/amandv123/driveplay.git
cd driveplay
npm install
```

### Start development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## ⚡ Performance Philosophy

Performance is a core requirement, not a later optimization.

DrivePlay is being designed to:

- Prefer native browser media playback
- Minimize unnecessary React re-renders
- Keep high-frequency playback state outside expensive UI paths
- Use efficient event/update strategies for progress and seeking
- Avoid unnecessary media transformations
- Keep the player bundle lean
- Handle long videos without unnecessary memory growth
- Treat buffering, seeking, and recovery as first-class states

A feature will not be considered complete simply because it works. It should also behave well on realistic mobile and desktop hardware.

---

## 🔐 Privacy & Access

DrivePlay is intended for videos the user **owns or is authorized to access**.

The project will use Google's supported authorization mechanisms for private Drive content rather than attempting to bypass Drive permissions or access controls.

Credentials and access tokens should never be committed to the repository.

---

## 🗺️ Roadmap

### Phase 1 — Media Pipeline
- [x] Project foundation
- [x] Drive URL parsing
- [x] File ID extraction
- [x] Resolver abstraction
- [x] Native playback probe
- [ ] Google Drive API integration
- [ ] Authorized media access
- [ ] Reliable range-based seeking
- [ ] Playback reliability testing

### Phase 2 — Premium Controls
- [ ] Custom control bar
- [ ] Seek controls
- [ ] Playback speed
- [ ] Temporary 2× hold
- [ ] Volume / mute
- [ ] Keyboard shortcuts
- [ ] Fullscreen
- [ ] Picture-in-Picture
- [ ] Theater mode

### Phase 3 — Media Features
- [ ] Subtitles
- [ ] Audio tracks
- [ ] Quality selection
- [ ] Resume playback
- [ ] Metadata panel
- [ ] Custom thumbnails

### Phase 4 — Performance & Reliability
- [ ] Mobile gesture system
- [ ] Buffering UX
- [ ] Retry / recovery
- [ ] Long-video testing
- [ ] Cross-browser testing
- [ ] Performance profiling

### Phase 5 — Production
- [ ] Accessibility audit
- [ ] Security review
- [ ] Production deployment
- [ ] Monitoring
- [ ] Documentation
- [ ] DriveClone integration

---

## 🤝 Contributing

DrivePlay is currently under active development.

The architecture and APIs may change while the media pipeline is being validated. Contributions, bug reports, and technical feedback are welcome once the core playback architecture stabilizes.

---

## 📄 License

License information will be added before the first stable public release.

---

## ⭐ Project

**DrivePlay**  
*A Better Way to Watch.*
