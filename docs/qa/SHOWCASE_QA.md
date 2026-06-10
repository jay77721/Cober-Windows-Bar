# Showcase QA

`/showcase` is the shared review entry for Stage 0 UI Prototype work, the Stage 1 Interactive Event Playground, and the current mock Provider SDK demo path.

The page is still mock-only. It may use mock providers and the Provider SDK adapter, but it must not depend on Tauri, real providers, system APIs, tray behavior, or always-on-top windowing.

`/desktop` is the product-style mock desktop preview. It removes the Showcase review panels and presents the Hub as a compact desktop surface with a mock taskbar context. Tauri dev opens this route by default so the local desktop window previews the product surface instead of the review page.

## Run

```bash
npm run dev:showcase
```

Or start the dev server and open:

```text
http://localhost:5173/showcase
http://localhost:5173/desktop
```

Open the mock desktop preview in a Tauri desktop window:

```bash
npm run desktop:mock
```

## Automated Checks

Run state tests and production build:

```bash
npm run qa
```

Run the repeatable interaction check for the Showcase Provider Demo and Tauri Fixture flows:

```bash
npm run qa:showcase:interactions
```

The script verifies `/showcase`, `/desktop`, Provider Demo source switching, Stop provider, Clear to idle, Tauri Fixture publishing, stale fixture/request cancellation after Clear to idle, the not-found fallback, and console/page errors. It starts a local Vite server if one is not already available.

### Interaction QA server paths on Windows

The interaction harness has two supported local paths. Both are QA harness behavior only; they do not imply that real providers, native Windows APIs, Tauri tray behavior, always-on-top behavior, or production packaging are implemented.

Self-start path:

1. Confirm no project Vite server is already serving `http://127.0.0.1:5173/showcase`.
2. Run:

   ```bash
   npm run qa:showcase:interactions
   ```

3. Expected result: the success output includes `(started Vite)`, the command exits naturally, and no Vite/npm/node process tree started by that QA run remains afterward.

Existing-server path:

1. Start the external Vite server yourself:

   ```bash
   npm run dev -- --host 127.0.0.1
   ```

2. Confirm `http://127.0.0.1:5173/showcase` returns 200.
3. In another terminal, run:

   ```bash
   npm run qa:showcase:interactions
   ```

4. Expected result: the success output does not include `(started Vite)`, the command exits naturally, and `http://127.0.0.1:5173/showcase` still returns 200 afterward.
5. Stop only the external Vite server process tree you started for this verification.

Cleanup safety boundary:

- Do not kill by port, process name, or global node/npm/vite process search.
- Do not use broad cleanup such as killing all `node.exe`, `npm.exe`, or `vite` processes.
- The interaction script may clean up only the Vite/npm process tree it spawned and recorded.

Windows sandbox note:

- In restricted sandboxes, Vite/esbuild can fail while resolving the project with an error like `Cannot read directory "../../..": Access is denied`.
- Treat that as an environment reproduction risk. If the same command passes in a normal local Windows environment, do not change product code for the sandbox-only failure.
- If both local paths fail in a normal environment, capture stdout/stderr and stop for investigation instead of widening cleanup or changing product behavior.

Generate visual QA screenshots after the dev server is running:

```bash
npm run qa:showcase:screenshots
```

Screenshots are written to `output/playwright/`. This directory is a local QA artifact and should not be committed.

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

## v0.3 Mock Provider Demo Checks

- Provider Demo Music feeds a mock provider event through the existing event bus/store/resolver path.
- Provider Demo AI feeds a mock provider event through the existing event bus/store/resolver path.
- Provider Demo Download feeds a mock provider event through the existing event bus/store/resolver path.
- Provider Demo Notify feeds a mock provider event through the existing event bus/store/resolver path.
- Stop provider stops the provider source without pretending to clear already visible events.
- Clear to idle stops the provider source, clears active events, and resolves back to Idle.
- Tauri Fixture publishes the injected runtime fixture through the existing event bus/store/resolver path and resolves to AI Progress.
- Clear to idle prevents a delayed Tauri Fixture request from republishing stale fixture content or updating the playground label afterward.
- The page still does not use real Windows APIs, system notification readers, media-session readers, file watchers, or Tauri IPC.

## Acceptance Checklist

- `npm run qa` passes.
- `npm run qa:showcase:interactions` passes.
- `npm run qa:showcase:screenshots` can generate the 1366, 1440, and 1920 screenshots when the dev server is running.
- `/showcase` remains mock-only and does not require Tauri or real Provider implementation.
- Stage 1 and Stage 2 mock behavior prove state transitions and provider boundaries without claiming Stage 5-7 real provider capabilities are fully implemented.

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

## v0.3.4 Demo Asset Plan

Keep this wave docs-only. Do not commit GIFs, videos, or generated binary assets.

Generate repeatable local screenshots with:

```bash
npm run qa:showcase:screenshots
```

The generated files belong in `output/playwright/` and should be used for local review only unless explicitly selected for a later docs asset wave.

Static screenshot commit thresholds:

- `<500KB`: may be considered for commit.
- `500KB-1MB`: needs monitor approval before commit.
- `>1MB`: should not be committed.

Recommended demo review sequence:

```text
Idle -> Music -> AI -> Notification -> MultiTask
```

Recommended loop length: 10-15 seconds for local capture review only.
