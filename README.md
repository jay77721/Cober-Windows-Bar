# Cober-Windows-Bar

Windows 11 Unified Status Hub for lightweight, glanceable desktop status.

Current release track: **v0.3.1 Provider SDK Validation & Polish**.

## Overview

Cober-Windows-Bar is a Windows 11-style Unified Status Hub. The long-term product idea is a small, native-feeling status surface above the taskbar that can summarize music, AI work, downloads, notifications, developer tasks, and agent activity without becoming a full dashboard.

The current implementation is still front-end only. It uses mock data, the local event playground, and a mock Provider SDK boundary to prove that the hub can move through meaningful states. It does not include Tauri, Windows/system APIs, real provider integrations, tray behavior, or always-on-top windowing.

## Current Capabilities

- Win11/Mica/Acrylic `/showcase` review page.
- Six hub states: Idle, Music, AI Progress, Download, Notification, MultiTask.
- v0.2 event controls for triggering mock status changes.
- Auto Demo flow for recording a short state-transition demo.
- Resolver visualization showing active events, resolver output, and current mode.
- v0.3 mock Provider SDK contract, fake providers, and provider adapter validation.
- QA commands for state tests, production build, and viewport screenshots.

## Local Development

```bash
npm install
npm run dev
```

Showcase entry:

```text
http://localhost:5173/showcase
```

Open the showcase directly:

```bash
npm run dev:showcase
```

Build and QA:

```bash
npm run build
npm run qa
```

Generate showcase screenshots after the dev server is running:

```bash
npm run qa:showcase:screenshots
```

Screenshots are written to `output/playwright/` and are local QA artifacts only.

## v0.2 Interactive Event Playground

The current v0.2 goal is to prove "this thing moves" before any provider or desktop-shell work.

Required controls:

- Music
- AI
- Download
- Notification
- MultiTask
- Clear / Idle
- Start Demo

Expected data flow:

```text
Event Controls -> publishHubEvent() -> store -> resolver -> resolved UI mode
```

Auto Demo should move through:

```text
Idle -> Music -> AI -> Notification -> Download -> MultiTask -> Idle
```

The resolver visualization should show:

- Active Events
- Current Mode
- A compact Events -> Resolver -> Resolved Mode flow

## v0.2.1 Validation & Polish

v0.2.1 focuses on making the playground ready for README/GitHub/demo capture. It does not add Provider SDK, Tauri, or real system integrations.

Planned lightweight showcase assets:

- `docs/screenshots/idle.png`
- `docs/screenshots/music.png`
- `docs/screenshots/ai.png`
- `docs/screenshots/download.png`
- `docs/screenshots/notification.png`
- `docs/screenshots/multitask.png`
- `docs/demo/event-playground.gif`

The GIF should loop a 10-15 second sequence:

```text
Idle -> Music -> AI -> Notification -> MultiTask
```

Large GIF/video binaries should not be committed without checking their size first.

## v0.3.1 Provider SDK Validation & Polish

v0.3.1 validates and documents the mock Provider SDK from v0.3. It is a polish pass over the provider contract, event flow, and test/readme clarity.

Provider SDK scope:

- Provider lifecycle contract: `start()`, `stop()`, and `subscribe(listener)`.
- Fake Music, Download, AI Task, and Notification providers only.
- Provider adapter that forwards provider output into the existing event bus.
- Tests that prove provider-emitted `HubEvent` objects resolve to the expected hub modes.

Event flow:

```text
Fake Provider
  -> provider adapter
  -> publishHubEvent()
  -> store
  -> resolver
  -> existing Hub UI
```

Current limitations:

- No Tauri shell, IPC, tray, always-on-top, or desktop-window behavior.
- No Windows/system APIs, media-session readers, file watchers, or notification-center readers.
- No real providers or external integrations.
- No `/showcase` visual redesign; the Win11/Mica/Acrylic review page remains intentionally stable.

See [Provider SDK](docs/PROVIDER_SDK.md) for the concise contract and flow reference.

## Product Route

- **Stage 0: UI Prototype** - done and pushed as v0.1.
- **Stage 1: Event Playground** - done as v0.2; mock controls, auto demo, resolver visualization.
- **Stage 2: Provider SDK** - current v0.3/v0.3.1 work; interfaces, fake providers, adapter validation, no system integration.
- **Stage 3: Tauri Shell** - later; desktop shell and window behavior.
- **Stage 4: Real Providers** - later; system, music, download, notification, and AI task providers.
- **Stage 5: Developer Hub** - later; Git, Docker, WSL, Maven, Gradle, and related developer surfaces.
- **Stage 6: AI Agent Hub** - later; agent status, queue state, and long-running AI work visibility.

## Documentation

- [PRD](docs/PRD.md)
- [UI Spec](docs/UI_SPEC.md)
- [Showcase QA](docs/SHOWCASE_QA.md)
- [Provider SDK](docs/PROVIDER_SDK.md)
- [Roadmap](docs/ROADMAP.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## License

MIT
