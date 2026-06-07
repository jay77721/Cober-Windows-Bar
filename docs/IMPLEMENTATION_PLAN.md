# Cober-Windows-Bar Implementation Plan

## 1. Product Narrative

Cober-Windows-Bar is a **Windows 11 Unified Status Hub**. It starts as a visual and interaction prototype, then gradually grows into a native-feeling desktop surface for status, developer work, and AI agent activity.

The current route is v0.7 mock/fixture runtime boundary proof and Showcase polish. v0.6 closed the mock Provider SDK alignment at `92f3e01 test: harden provider alignment coverage`. Since then, narrow v0.7 slices have landed to prove fixture events can cross the Tauri/runtime boundary and still flow through the existing Event Bus, Store, Resolver, and Showcase UI path.

The completed v0.7 slices are still mock/fixture-only. They do not implement real providers, Windows/system APIs, Tauri tray behavior, always-on-top windowing, production packaging, signing, updater, installer behavior, or real native integration.

## 2. Stage Route

- **Stage 0: UI Prototype** - done and pushed as v0.1. Delivered the Win11-style `/showcase` UI review page and six static hub states.
- **Stage 1: Event Playground** - done as v0.2. Proved state transitions with mock Event Controls, Auto Demo playback, and Resolver Visualization.
- **Stage 2: Architecture Planning** - closed v0.4. Documented runtime boundaries and future Tauri/Windows architecture needs only.
- **Stage 3: Mock Provider SDK Planning and Alignment** - v0.5/v0.6. Define and align provider lifecycle, registry, runtime, test strategy, mock providers, and provider tests; no Windows/system integration.
- **Stage 4: Tauri Shell Runtime Spike** - v0.7. Freeze and prove the shell/runtime/IPC boundary with mock or fixture events only.
- **Stage 5: First Real Provider** - v0.8 or later. First real system integration after the Tauri boundary is proven.
- **Stage 6: Developer Hub** - v0.9 or later. Add Git, Docker, WSL, Maven, Gradle, npm/pnpm, Cargo, and developer workflow surfaces.
- **Stage 7: AI Agent Hub** - v1.0. Add Codex, Claude, GPT/OpenCode/Gemini-style agent status, queue state, progress, and multi-agent visibility.

The long-term product ceiling is a Windows 11 **Unified Status Hub**, not only a Dynamic Island clone. Real providers, developer workflows, and AI agent status are the strongest differentiation bets, but they must wait until the interaction model and desktop shell/runtime boundary are proven.

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

## 6. v0.4 Runtime/Tauri Architecture Planning Scope

v0.4 is docs-only. It should describe how the app moves from a mock runtime to a Tauri runtime and eventually to a Windows runtime without introducing native implementation work.

Runtime sequence:

```text
Mock Runtime -> Tauri Runtime -> Windows Runtime
```

Planning scope:

- `docs/TAURI_STRATEGY.md` documents v0.4 as planning only.
- The Tauri shell is described through architecture requirements: windowing, IPC, packaging, startup, always-on-top, and docking behavior.
- The Tauri shell spike is deferred until after the v0.6 Mock Provider SDK alignment slice.
- Real Windows providers are deferred until after the Tauri shell spike.
- Provider sequencing remains mock-first: Mock Provider SDK planning in v0.5, Mock Provider SDK alignment in v0.6, Tauri shell/runtime/IPC boundary planning and spike in v0.7, and first real provider after the shell boundary is proven.

Do not implement these in v0.4:

- Tauri setup, Rust code, IPC, tray, always-on-top, startup, or packaging behavior
- Windows APIs, media sessions, file watchers, notification readers, or system information providers
- Real provider implementations
- Source code, package, script, or binary asset changes

## 7. v0.5 Mock Provider SDK Planning Scope

Stage 3 adds a minimal Provider SDK boundary without connecting to the operating system. v0.5 should clarify the contract, runtime execution, event flow, tests, and docs expectations while keeping all provider data mocked.

Current v0.5 sequence:

- **v0.5.0 Mock Provider SDK Planning** - provider lifecycle, registry, and mock strategy docs.
- **v0.5.1 Implementation Plan docs-only** - provider runtime and test strategy docs. Code changes: **0**.
- **v0.5.2 Review & Freeze** - review the provider docs and freeze the first implementation slice.
- **v0.5.3 Documentation Alignment** - resolve event contract, runtime path, lifecycle, registry matrix, and v0.6 scope contradictions.
- **v0.5.4 Review & Freeze** - re-review the aligned provider docs before implementation.
- **v0.6 Mock Provider SDK Alignment** - closed at `92f3e01 test: harden provider alignment coverage`.
- **v0.7 Tauri Scope Freeze** - reconcile the route and freeze the shell/runtime/IPC boundary before native implementation.

The canonical runtime path is:

```text
Provider -> Event Bus -> Store -> Resolver -> UI
```

Provider registry and provider adapter layers may assist with metadata, health, lifecycle supervision, and event forwarding, but they must not bypass the Event Bus, Store, Resolver, or UI boundary.

v0.6 implemented provider alignment scope:

- `src/providers/types.ts` defines the provider lifecycle and listener contract.
- `src/providers/mockProviders.ts` emits mock Music, Download, AI, and Notification events.
- `src/providers/providerAdapter.ts` forwards provider events into the existing event bus.
- `src/providers/provider.test.ts` verifies provider output resolves to the expected hub modes.
- `src/providers/providerRegistry.ts` owns the minimum in-memory provider inventory and lifecycle/health snapshots.
- `src/providers/providerRegistry.test.ts` verifies registry behavior.
- `docs/PROVIDER_RUNTIME.md` documents the v0.5.3 aligned runtime plan.
- `docs/TEST_STRATEGY.md` documents the v0.5.1 test plan that v0.5.3 keeps as planning input.
- `docs/PROVIDER_SDK.md` documents the contract, event flow, and v0.5 limitations.

v0.6 does not include Tauri, IPC, Rust, Windows APIs, real providers, media sessions, notification center readers, download monitoring, tray behavior, always-on-top behavior, or packaging work. Those remain later-stage planning or implementation items after the mock provider runtime slice is proven.

## 8. v0.7 Tauri Runtime Boundary Proof

v0.7 freezes and proves the Tauri shell/runtime/IPC boundary before any real native provider implementation starts.

Goal:

- Prove the shell/runtime/IPC boundary using mock or fixture canonical HubEvents.
- Preserve the existing event path: Provider -> Event Bus -> Store -> Resolver -> UI.
- Keep the UI agnostic to whether events came from mock providers, IPC fixtures, or future Windows providers.
- Define boundary diagnostics for unavailable native runtime data or malformed IPC payloads.

Completed narrow slices:

- Tauri fixture command and IPC fixture boundary scaffold.
- Frontend runtime adapter for Tauri invoke detection, fixture loading, malformed data handling, and unavailable/invoke-failed diagnostics.
- Runtime bridge proof that fixture events can be published through the Event Bus boundary.
- Explicit Showcase playground entry for manually triggering the Tauri fixture path.
- Runtime bridge tests included in the standard `npm run qa` gate.
- Showcase interaction QA process cleanup and Windows/Vite path documentation.
- Store-derived `tasks`, `music`, and `notification` data fed into the main Hub preview.
- Showcase preview status polish that exposes active mode, event count, and current mock/fixture source in the main preview.

Minimum success criteria:

- The Tauri spike has a narrow mock/fixture goal and explicit non-goals.
- Mock or fixture canonical HubEvents remain the only data source.
- The spike does not bypass Event Bus, Store, Resolver, or UI boundaries.
- Failure handling is defined as boundary diagnostics, not as real provider behavior.
- The route remains clear: v0.7 proves shell/runtime/IPC; first real provider waits until after that proof.

Non-goals:

- Windows APIs, media sessions, file watchers, or system notification readers
- Real provider implementations
- Tauri tray, always-on-top windowing, or production packaging
- `/showcase` visual redesigns
- Store, Resolver, or ProviderRegistry expansion
- Broad Rust module design
- Production packaging polish

## 9. Boundaries

Do not implement these in route reconciliation:

- Tauri, Rust, IPC, tray, always-on-top behavior, or native shell setup
- Windows/system APIs
- Real MusicProvider, DownloadProvider, NotificationProvider, SystemProvider, or AITaskProvider implementations
- Media sessions, file watchers, notification-center readers, or external service integrations
- Showcase visual redesigns or new product surfaces

Stage 3-7 items may be described as future direction only.

## 10. QA Plan

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
- Provider SDK validation remains mock-only and does not require Tauri, Windows/system APIs, or real providers.
- v0.4 docs clearly state that architecture planning does not include Tauri implementation, Rust, IPC, Windows/system API integration, real providers, package/script changes, or showcase visual redesign.
