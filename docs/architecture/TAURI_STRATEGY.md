# Tauri Strategy

## Purpose

This document describes the Tauri integration strategy for Cober-Windows-Bar. The Tauri runtime is now fully integrated (as of v0.7+), providing the desktop shell, native system APIs, and IPC boundary for the application.

## Version Placement

- **v0.4 Architecture Planning**: documented runtime boundaries, shell needs, IPC shape, packaging expectations, and provider sequencing. (Completed)
- **v0.5 Mock Provider SDK**: provider contracts and validation kept mock-only inside the web/runtime boundary. (Completed)
- **v0.6 Mock Provider SDK Alignment**: closed at `92f3e01 test: harden provider alignment coverage`. (Completed)
- **v0.7 Tauri Integration**: full desktop shell, runtime, and IPC boundary implemented with real native capabilities. (Completed)
- **v0.8 First Real Providers**: system performance and media session providers connected through Tauri IPC. (In Progress)
- **v0.9 Developer Hub**: expand provider surfaces for developer workflows. (Planned)
- **v1.0 AI Agent Hub**: make long-running AI agent activity a first-class status surface. (Planned)

## Runtime Layers

The product operates through three runtime layers, all now active:

```text
Mock Runtime (fallback) -> Tauri Runtime (active) -> Windows Runtime (partial)
```

### Mock Runtime (Fallback)

The mock runtime remains available when Tauri is not present (e.g., `npm run dev` in a browser). It provides:

- Deterministic mock `HubEvent` data from `mockHubData.ts` and `mockProviders.ts`.
- Showcase controls for manual event injection.
- Provider contract validation without operating-system access.
- Fast iteration loop for UI, state, and architecture work.

### Tauri Runtime (Active)

The Tauri runtime is the primary production runtime. It provides:

- **Desktop shell**: 315×80px compact floating window, Fluent Design styling.
- **Window management**: Always-on-top (Z-order via `HWND_TOPMOST`/`HWND_BOTTOM`), tool window style (`WS_EX_TOOLWINDOW`), position correction to monitor work areas, multi-monitor support.
- **Fullscreen avoidance**: Detects fullscreen foreground windows via Win32 APIs (`GetForegroundWindow`, `GetWindowRect`, `MonitorFromWindow`) and auto-hides the status bar.
- **System tray**: Tray icon with context menu (show/settings/quit), left-click toggle visibility.
- **Global hotkey**: `Alt+Shift+Space` to recall/show the status window.
- **Preferences persistence**: JSON file storage for always-float, avoid-fullscreen, lock-position settings.
- **IPC command set**: 16 Tauri commands bridging Rust backend to TypeScript frontend.

### Windows Runtime (Partial)

Real Windows API integrations currently active:

- **System performance**: CPU, memory, and network metrics via `sysinfo` crate.
- **Media session**: Windows GSMTC API for real-time playback status, position, and duration.
- **Window management**: Full Win32 API integration for Z-order, tool window style, fullscreen detection.

Not yet implemented:

- Windows notification center reader.
- Downloads folder file watcher.
- Focus Assist API integration.
- Clipboard monitoring.

## IPC Architecture

The IPC boundary carries normalized data between Rust and TypeScript:

```text
Windows API -> Rust Backend -> Tauri IPC (invoke/events) -> Runtime Adapter -> Event Bus -> Store -> Resolver -> UI
```

### IPC Commands (TypeScript → Rust)

| Command | Purpose |
|---------|---------|
| `get_system_performance` | CPU/memory/network snapshot |
| `get_runtime_capabilities` | Runtime feature flags |
| `get_guest_provider_capabilities` | Per-provider availability status |
| `get_media_session_status` | Current media playback state |
| `get_hub_event_fixtures` | Test fixture events |
| `emit_hub_event_fixtures` | Push fixture events via Tauri event system |
| `get_overlay_policy` | Fullscreen detection + float decision |
| `set_status_window_floating` | Toggle always-on-top |
| `correct_status_window_position` | Clamp to monitor work area |
| `start_window_drag` | Begin native window drag |
| `show_status_center_context_menu` | Native context menu at coordinates |
| `get_status_center_settings` | Read current preferences |
| `set_status_center_preferences` | Write preferences + update menu state |
| `show_status_center_window` | Show/recall the status window |
| `open_status_center_settings` | Request settings panel open |
| `quit_status_center` | Exit the application |

### IPC Events (Rust → TypeScript)

| Event | Purpose |
|-------|---------|
| `status-center://hub-events` | Real-time hub event push stream |
| `status-center://menu-action` | Context menu item selected |
| `status-center://settings` | Preferences changed externally |
| `status-center://open-settings` | Settings panel open requested |

### IPC Requirements

- Event payloads stay normalized around the `HubEvent` model.
- IPC messages are small, serializable, and inspectable.
- The UI does not know whether an event came from mock, fixture, or native source.
- Native errors become explicit runtime diagnostics, not silent failures.
- Privacy-sensitive data never crosses IPC (see privacy checklist).

## Window And Shell Behavior

Implemented:

- Compact floating status surface (315×80px, non-resizable).
- Tool window style (hidden from taskbar).
- Lower-right positioning with work area clamping and 8px edge margin.
- Always-on-top via Z-order management (not Tauri's `set_always_on_top`, using direct `SetWindowPos` for finer control).
- Fullscreen avoidance with automatic hide/show based on foreground window.
- Multi-monitor support with position correction on display/scale changes.
- Debounced correction (500ms for scale changes, 220ms for display changes).
- Startup position reassertion at 1s, 5s, and 9s intervals.

Future:

- Click-through mode (pending user testing).
- Edge snapping/alignment.
- Custom window chrome for Fluent Design acrylic effect.

## Packaging

Current state:

- Tauri dev mode works (`npm run tauri dev`).
- Build configuration in `tauri.conf.json`.

Future needs:

- Code signing certificate.
- MSI/NSIS installer configuration.
- Auto-updater integration.
- Windows SmartScreen compatibility.

## Provider Sequencing

Real providers are being integrated in this order:

1. ✅ **System Performance** — CPU, memory, network via sysinfo (connected, needs Provider SDK wrapping)
2. ✅ **Media Session** — Windows GSMTC playback status (connected, needs Provider SDK wrapping)
3. ⬜ **Focus/Do Not Disturb** — Windows Focus Assist API
4. ⬜ **Clipboard** — Windows clipboard monitoring
5. ⬜ **Downloads** — File system watcher or browser integration
6. ⬜ **Notifications** — Windows notification center (privacy-safe)
7. ⬜ **Developer tools** — Git, Docker, WSL, build systems (Stage 6)
8. ⬜ **AI Agents** — Codex, Claude, GPT agent sessions (Stage 7)
