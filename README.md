# Cober-Windows-Bar

Windows 11-style status hub showcase for proving glanceable desktop state flows and the mock/fixture runtime boundary before real native integration work begins.

Current release track: **v0.7 mock/fixture runtime boundary and Showcase polish**.

## Current Status

Cober-Windows-Bar is currently a mock and fixture-driven `/showcase` experience. It demonstrates the product direction for a lightweight Windows 11 status surface and now includes a narrow v0.7 Tauri/runtime boundary proof, but it is not a real native integration yet.

What exists today:

- Win11/Mica/Acrylic showcase UI for core hub states.
- Event Playground controls for publishing mock hub events.
- Auto Demo flow for recording state transitions.
- Resolver visualization for active events, resolver output, and current mode.
- Mock Provider SDK demo that feeds provider-style events into the same resolver path.
- Tauri fixture command and runtime adapter scaffold for canonical mock `HubEvent` fixtures.
- Runtime bridge proof that fixture events can enter the Event Bus boundary.
- Explicit Showcase playground entry for the Tauri fixture path.
- Store-derived main preview data and a status header that connects the resolved Hub preview to the active event source.
- QA coverage that includes state, provider, runtime bridge, build, and Showcase interaction checks.

What does not exist yet:

- No real Windows provider implementation or native system integration.
- No Windows/system APIs, media-session readers, notification readers, file watchers, or OS hooks.
- No Tauri tray, always-on-top behavior, production packaging, signing, updater, or installer.
- No real providers or external integrations.

## What It Proves

The current showcase proves the front-end interaction model and provider boundary before the project commits to Windows-native implementation details.

- The hub can present distinct, glanceable modes: Idle, Music, AI Progress, Download, Notification, and MultiTask.
- Manual playground events and mock provider events travel through one shared flow.
- Resolver behavior is visible enough to review, debug, and demo.
- The Win11 visual direction is stable enough for screenshots and demo capture.

Event flow:

```text
Event Playground / Mock Provider / Tauri Fixture
  -> publishHubEvent()
  -> Event Bus
  -> Store
  -> Resolver
  -> Store-derived Showcase Hub UI
```

## Try It

Install dependencies and run the local app:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173/showcase
```

Or start the showcase directly:

```bash
npm run dev:showcase
```

Use the Event Playground controls to trigger hub states, clear back to Idle, or run the Auto Demo sequence.

## QA Commands

Build and run the main QA checks:

```bash
npm run build
npm run qa
```

Run the repeatable Provider Demo interaction check:

```bash
npm run qa:showcase:interactions
```

Generate showcase screenshots after the dev server is running:

```bash
npm run qa:showcase:screenshots
```

Screenshots are written to `output/playwright/` as local QA artifacts and are not committed by default.

## Roadmap

- **Stage 0: UI prototype** - Win11/Mica showcase with the core hub states.
- **Stage 1: Event Playground** - mock event controls, resolver visualization, and Auto Demo.
- **Stage 2: Provider SDK** - mock providers and adapter validation, still without real system integration.
- **v0.7: Runtime boundary and Showcase polish** - prove mock/fixture Tauri IPC events can cross into the existing Event Bus -> Store -> Resolver -> UI path.
- **Stage 3: Desktop shell hardening** - continue Tauri shell work after the boundary proof, without claiming tray, always-on-top, or production packaging yet.
- **Stage 4: Real providers** - connect system, music, download, notification, and AI task sources after the native boundary is ready.
- **Stage 5+: Developer and agent hub** - add Git, Docker, WSL, build tool, and long-running AI work status surfaces.

## Documentation

- [PRD](docs/PRD.md)
- [UI Spec](docs/UI_SPEC.md)
- [Showcase QA](docs/SHOWCASE_QA.md)
- [Provider SDK](docs/PROVIDER_SDK.md)
- [Roadmap](docs/ROADMAP.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## License

MIT
