# Showcase QA

`/showcase` is the shared review entry for Stage 0 UI Prototype work and the current **v0.2 Interactive Event Playground**.

The page is still mock-only. It must not depend on Tauri, real Providers, system APIs, tray behavior, or always-on-top windowing.

## Run

```bash
npm run dev:showcase
```

Or start the dev server and open:

```text
http://localhost:5173/showcase
```

## Automated Checks

Run state tests and production build:

```bash
npm run qa
```

Generate visual QA screenshots after the dev server is running:

```bash
npm run qa:showcase:screenshots
```

Screenshots are written to `output/playwright/`. This directory is a local QA artifact and should not be committed.

Run the repeatable interaction check for the Provider Demo flow:

```bash
npm run qa:showcase:interactions
```

The script verifies `/showcase`, Provider Demo source switching, Stop provider, Clear to idle, and console/page errors. It starts a local Vite server if one is not already available.

## Required Viewports

- 1366 x 768
- 1440 x 900
- 1920 x 1080

## Stage 0 UI Prototype Checks

- `/showcase` renders with a Windows 11/Mica/Acrylic visual direction.
- The six hub states are visible and reviewable: Idle, Music, AI Progress, Download, Notification, MultiTask.
- The layout does not overflow horizontally at 1366, 1440, or 1920 widths.
- Text, icons, progress bars, shadows, and borders remain readable on the desktop background.
- The taskbar fusion demo feels aligned with Windows 11 spacing and centered taskbar behavior.

## v0.2 Interactive Event Playground Checks

Event Controls:

- Music publishes a mock event and resolves to Music mode.
- AI publishes a mock event and resolves to AI Progress mode.
- Download publishes a mock event and resolves to Download mode.
- Notification publishes a mock event and demonstrates notification priority.
- MultiTask creates a multi-event condition and resolves to MultiTask mode.
- Clear / Idle removes active events and resolves to Idle mode.

Auto Demo:

- Start Demo plays a readable sequence: Idle -> Music -> AI -> Notification -> Download -> MultiTask -> Idle.
- The sequence is suitable for a README/GitHub/Bilibili GIF capture.
- Manual controls remain usable after the demo finishes.

Resolver Visualization:

- Active Events are visible.
- Current Mode is visible.
- The page shows a compact Events -> Resolver -> Resolved Mode flow.
- Notification priority and MultiTask resolution are understandable from the visualization.

## Acceptance Checklist

- `npm run qa` passes.
- `npm run qa:showcase:screenshots` can generate the 1366, 1440, and 1920 screenshots when the dev server is running.
- `/showcase` remains mock-only and does not document or require Provider SDK, Tauri, or real Provider implementation.
- Stage 1 behavior proves state transitions without claiming Stage 2-6 capabilities are implemented.

## v0.2.1 Validation & Polish Gate

| gate | status |
| --- | --- |
| Event Flow Smooth | 1 |
| Resolver Readable | 1 |
| README Assets Ready / plan clear | 1 |
| Responsive Verified | 1 |
| Build Pass | 1 |

## v0.2.1 Resolution QA

| resolution | status |
| --- | --- |
| 1366x768 | 1 |
| 1440x900 | 1 |
| 1920x1080 | 1 |

## README Asset Plan

Static screenshots:

- `docs/screenshots/idle.png`
- `docs/screenshots/music.png`
- `docs/screenshots/ai.png`
- `docs/screenshots/download.png`
- `docs/screenshots/notification.png`
- `docs/screenshots/multitask.png`

Demo GIF:

- `docs/demo/event-playground.gif`

Recommended GIF sequence:

```text
Idle -> Music -> AI -> Notification -> MultiTask
```

Recommended loop length: 10-15 seconds. Do not commit large generated binaries without reviewing file size first.
