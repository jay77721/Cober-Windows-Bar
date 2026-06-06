# Cober-Windows-Bar Implementation Plan

## 1. Product Narrative

Cober-Windows-Bar is a **Windows 11 Unified Status Hub**. It starts as a visual and interaction prototype, then gradually grows into a native-feeling desktop surface for status, developer work, and AI agent activity.

The current implementation scope is **v0.3.1 Provider SDK Validation & Polish**. It proves that future integrations can emit `HubEvent` objects through a small provider contract while still using fake data only. It does not implement Tauri, real Providers, Windows/system APIs, system tray behavior, always-on-top windowing, or a `/showcase` visual redesign.

## 2. Stage Route

- **Stage 0: UI Prototype** - done and pushed as v0.1. Delivered the Win11-style `/showcase` UI review page and six static hub states.
- **Stage 1: Event Playground** - done as v0.2. Proved state transitions with mock Event Controls, Auto Demo playback, and Resolver Visualization.
- **Stage 2: Provider SDK** - current v0.3/v0.3.1. Define provider interfaces, fake providers, and an adapter into the existing event bus; no Windows/system integration.
- **Stage 3: Tauri Shell** - later. Turn the web UI into a native-feeling desktop shell after the playground is stable.
- **Stage 4: Real Providers** - later. First real system integration: system info/music, then notifications, then downloads.
- **Stage 5: Developer Hub** - later. Add Git, Docker, WSL, Maven, Gradle, npm/pnpm, Cargo, and developer workflow surfaces.
- **Stage 6: AI Agent Hub** - later. Add Codex, Claude, GPT/OpenCode/Gemini-style agent status, queue state, progress, and multi-agent visibility.

The long-term product ceiling is a Windows 11 **Unified Status Hub**, not only a Dynamic Island clone. Stages 5 and 6 are the strongest differentiation bets, but they must wait until Stage 1-4 prove the interaction model and desktop shell.

## 3. Current Technical Stack

- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- lucide-react
- Playwright CLI for showcase screenshots

## 4. Current Source Shape

```text
src/
|-- App.tsx
|-- main.tsx
|-- styles/
|   `-- globals.css
|-- components/
|   |-- hub/
|   |-- showcase/
|   `-- ui/
|-- data/
|   `-- mockHubData.ts
|-- pages/
|   `-- ShowcasePage.tsx
|-- state/
|   |-- hubScenarios.ts
|   |-- hubState.ts
|   `-- hubState.test.ts
`-- types/
    `-- hub.ts
```

## 5. v0.2 Interactive Event Playground Scope

### Event Controls

Controls should publish mock events through the existing event path:

```text
Event Controls -> publishHubEvent() -> store -> resolver -> resolved UI mode
```

Required controls:

- Music
- AI
- Download
- Notification
- MultiTask
- Start Demo
- Clear / Idle

### Auto Demo

`Start Demo` should automatically play:

```text
Idle -> Music -> AI -> Notification -> Download -> MultiTask -> Idle
```

The demo should be stable enough for README, GitHub, or Bilibili GIF capture.

Implementation notes:

- Keep the sequence deterministic for QA and repeatable screenshots.
- Keep manual controls usable after the sequence completes.
- Prefer a small scenario helper in `src/state/hubScenarios.ts` over provider-like abstractions.

### Resolver Visualization

The showcase should display:

- Active Events
- Current Mode
- Events -> Resolver -> Resolved Mode

The visualization should make notification priority and MultiTask resolution easy to verify.

### Current Integration Files

- `src/state/hubScenarios.ts` defines deterministic mock scenarios and the auto-demo sequence.
- `src/state/hubState.ts` remains the event bus/store/resolver boundary.
- `src/state/hubState.test.ts` protects scenario resolution, expiry, clear-to-idle, and playback order.
- `src/components/showcase/EventPlaygroundPanel.tsx` is the showcase control and visualization surface.
- `src/pages/ShowcasePage.tsx` integrates the panel while preserving the Stage 0 Win11/Mica shell.

## 6. v0.3/v0.3.1 Mock Provider SDK Scope

Stage 2 adds a minimal Provider SDK boundary without connecting to the operating system. v0.3.1 is a validation and polish pass over that boundary: clarify the contract, event flow, tests, and README/docs expectations.

Provider output must follow the existing path:

```text
Fake Provider -> provider adapter -> publishHubEvent() -> store -> resolver -> existing Hub UI
```

Current scope:

- `src/providers/types.ts` defines the provider lifecycle and listener contract.
- `src/providers/mockProviders.ts` emits fake Music, Download, AI Task, and Notification events.
- `src/providers/providerAdapter.ts` forwards provider events into the existing event bus.
- `src/providers/provider.test.ts` verifies provider output resolves to the expected hub modes.
- `docs/PROVIDER_SDK.md` documents the contract, event flow, and v0.3.1 limitations.

Do not implement these in v0.3.1:

- Windows APIs, media sessions, file watchers, or system notification readers
- Tauri, IPC, tray, or always-on-top behavior
- Real Provider implementations
- `/showcase` visual redesigns

## 7. Boundaries

Do not implement these in the current stage:

- Tauri, IPC, tray, or always-on-top behavior
- Windows/system APIs
- Real MusicProvider, DownloadProvider, NotificationProvider, SystemProvider, or AITaskProvider implementations
- Media sessions, file watchers, notification-center readers, or external service integrations
- Showcase visual redesigns or new product surfaces

Stage 2-6 items may be described as future direction only.

## 8. QA Plan

### Build

```bash
npm run build
```

### Full QA

```bash
npm run qa
```

`npm run qa` runs state tests, provider tests, and the production build.

### Showcase Screenshots

Run after the dev server is available:

```bash
npm run qa:showcase:screenshots
```

Required visual widths:

- 1366 x 768
- 1440 x 900
- 1920 x 1080

### Manual Acceptance

- `/showcase` keeps the Windows 11/Mica/Acrylic style from v0.1.
- Event Controls update the active events and current resolved mode.
- Auto Demo plays the full Stage 1 sequence and returns to Idle.
- Resolver Visualization explains why the current mode is selected.
- Provider SDK validation remains mock-only and does not require Tauri, Windows/system APIs, or real Providers.
- v0.3.1 docs clearly state that there is no Tauri shell, no Windows/system API integration, no real providers, and no showcase visual redesign.
