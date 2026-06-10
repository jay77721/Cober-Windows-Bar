# Cober-Windows-Bar Roadmap

Cober-Windows-Bar is a Windows 11 Unified Status Hub. The roadmap proves the product in layers: visual quality first, then state flow, then extension contracts, then desktop shell, then real data.

## Stage 0: UI Prototype

Goal: prove the hub looks credible.

Status: done and pushed as v0.1.

Delivered:

- Win11/Mica/Acrylic `/showcase` review page
- Six visible states: Idle, Music, AI Progress, Download, Notification, MultiTask
- Fluent-style components, animation, and responsive desktop layouts
- QA commands for build, state tests, and showcase screenshots

## Stage 1: Event Playground

Goal: prove the status flow is reasonable and the hub can move.

Status: done as v0.2.

Scope:

- Mock events only
- Event Controls: Music, AI, Download, Notification, MultiTask, Clear / Idle
- Auto Demo: Idle -> Music -> AI -> Notification -> Download -> MultiTask -> Idle
- Resolver Visualization: Active Events -> Resolver -> Current Mode
- Event path: mock event -> event bus -> store -> resolver -> Hub UI

Out of scope:

- Provider SDK
- Tauri
- IPC
- Real system APIs
- Tray or always-on-top behavior

## Stage 2: Architecture Planning

Goal: plan the runtime boundary before desktop work begins.

Status: closed v0.4 architecture planning work.

Scope:

- Document the runtime sequence: Mock Runtime -> Tauri Runtime -> Windows Runtime
- Define Tauri shell needs as architecture requirements only
- Capture IPC, windowing, packaging, and provider sequencing decisions
- Keep all data mocked and all desktop/native work out of scope

Out of scope for v0.4:

- Tauri, Rust, IPC, tray, always-on-top, or desktop-shell implementation
- Windows/system APIs
- Real provider implementations
- Source code or package/script changes

## Stage 3: Mock Provider SDK

Goal: prove future integrations can be added cleanly without native dependencies.

Status: v0.5 planning and v0.6 alignment/implementation are closed. v0.6 closed at `92f3e01 test: harden provider alignment coverage`.

Scope:

- Define provider interfaces and lifecycle contracts
- Add fake providers only
- Keep all data mocked
- Validate the provider adapter path into the existing event bus, store, resolver, and Hub UI
- Document the contract and current limitations

Example contract:

```ts
interface Provider {
  start(): void;
  stop(): void;
  subscribe(listener: (events: HubEvent[]) => void): () => void;
}
```

Candidate fake providers:

- MusicProvider
- DownloadProvider
- NotificationProvider
- AITaskProvider

Event flow:

```text
Mock Provider -> Event Bus -> Store -> Resolver -> existing Hub UI
```

Out of scope for v0.5:

- Tauri, IPC, tray, always-on-top, or desktop-shell behavior
- Windows/system APIs
- Real provider implementations
- Showcase visual redesign

## Stage 4: Tauri Desktop Shell

Goal: prove and deliver the desktop shell, runtime, and IPC boundary.

Target: v0.7.

Status: **done.** The Tauri shell, runtime, and IPC boundary have been fully integrated. This significantly exceeded the original spike goal and delivered a working desktop application.

Delivered:

- Tauri 2 application shell with `src-tauri/src/lib.rs` (1226 lines of Rust)
- Real system performance metrics via `sysinfo` crate (CPU, memory, network)
- Windows Media Session integration via WinRT GSMTC API (playback status, position, duration)
- Foreground fullscreen detection via Win32 APIs (`GetForegroundWindow`, `GetWindowRect`, `MonitorFromWindow`)
- Window Z-order management (`HWND_TOPMOST`/`HWND_BOTTOM` via `SetWindowPos`)
- `WS_EX_TOOLWINDOW` style (hidden from taskbar)
- System tray icon with context menu (show/settings/quit)
- Global hotkey `Alt+Shift+Space` for window recall
- Preferences persistence (JSON file in app config dir)
- Window drag via Tauri `start_dragging()`
- Multi-monitor position correction with work area clamping
- DPI scale change handling with debounced correction
- Hub event fixture stream for IPC boundary proof
- Guest provider capability reporting (media as native, others as unavailable)
- Frontend runtime bridge layer with Tauri IPC detection and graceful mock fallback
- Diagnostic error classification (unavailable, invoke-failed, malformed, timeout, permission-denied)
- Desktop product runtime with menu action, settings, and open-settings event listeners
- Desktop status input runtime with three-tier source: mock → tauri-fixture → tauri-event push
- System performance runtime with live/fallback/stale/unavailable quality tracking
- Status window overlay runtime with floating policy, fullscreen avoidance, and startup reassert

## Stage 5: First Real Providers

Goal: connect real system data through the provider SDK lifecycle.

Target: v0.8 or later.

Status: **in progress.** System performance and media session data already flow end-to-end from Rust through Tauri IPC to the frontend runtime layer. The next step is wrapping these into the Provider SDK lifecycle (start/stop/health) so they integrate through the provider registry and adapter rather than bypassing it.

What is real today:

- CPU, memory, and network metrics from `sysinfo` crate, displayed in `ResidentStatusTemplate`
- Windows Media Session (GSMTC) playback status in `MediaStatusTemplate`
- Full frontend polling loop (every 1800ms) with graceful fallback to mock data
- Provider health monitoring via `GuestProviderSourceHealth` in UI

What remains:

- Wrap system performance and media session as `HubProvider` implementations registered in `ProviderRegistry`
- Remove direct polling from `DesktopPage.tsx`, route through provider adapter → event bus → store → resolver
- Focus mode provider (Windows Focus Assist API)
- Clipboard watcher provider (Windows `AddClipboardFormatListener`)
- Download watcher provider (file system monitor or browser integration)
- Notification provider (Windows Notification Listener API)

## Stage 6: Developer Hub

Goal: become a daily developer status center.

Target: v0.9 or later, after core providers are stable.

Candidate surfaces:

- Git working tree status
- Docker builds and containers
- WSL status
- Maven and Gradle builds
- npm, pnpm, and Cargo tasks

This stage is one of the strongest differentiation points because developer workflows create persistent, glanceable status.

## Stage 7: AI Agent Hub

Goal: summarize long-running AI work and multi-agent activity.

Target: v1.0.

Candidate surfaces:

- Codex
- Claude
- GPT/OpenCode/Gemini-style agent sessions
- Running, waiting, analyzing, generating, and reviewing states
- Multi-agent progress summaries

This stage turns the product from a notification surface into a unified status layer for modern AI-assisted work.

## Product Principle

Prefer clear status flow over early real-data breadth. The mock event playground and provider SDK established the architecture. The Tauri shell and first real providers (system performance, media session) have validated the runtime boundary. Future providers must follow the same pattern: normalize into `HubEvent` through the provider adapter, flow through the event bus, store, and resolver, and render without the UI knowing the data source.
