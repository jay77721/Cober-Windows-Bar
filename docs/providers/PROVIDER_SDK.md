# Provider SDK

The Provider SDK defines the contract for all status data sources in Cober-Windows-Bar. Providers normalize their domain-specific data into `HubEvent` objects and publish them through the event bus, keeping the UI agnostic to data origin.

## Current Status (v0.8)

The Provider SDK contract and infrastructure are fully implemented. Mock providers exercise the full pipeline. Real native data (system performance, media session) currently flows through the runtime layer directly and is being migrated into the Provider SDK pattern.

### What exists today

- **Provider interface** (`src/providers/types.ts`): Full lifecycle contract — `start()`, `stop()`, `subscribe()`.
- **Provider Registry** (`src/providers/providerRegistry.ts`): Registration, lookup, lifecycle tracking, capability support metadata, diagnostic summaries.
- **Provider Adapter** (`src/providers/providerAdapter.ts`): Bridges provider events into the event bus with per-event failure isolation.
- **Mock Providers** (`src/providers/mockProviders.ts`): Music, Download, AI Task, and Notification providers with deterministic fake data.
- **Native data via runtime layer**: System performance (CPU/RAM/network) and media session (GSMTC) data flow through `src/runtime/` into the frontend, bypassing the provider SDK. This is the next area to be unified.

### What is pending

- Wrap system performance and media session as `HubProvider` implementations.
- Register native providers in the `ProviderRegistry` with proper lifecycle management.
- Route native data through the provider adapter → event bus → store → resolver path.
- Implement remaining providers: Focus, Clipboard, Downloads, Notifications.

## Contract

Providers expose a small lifecycle and listener contract:

```ts
interface HubProvider {
  id: string;
  displayName: string;
  capabilities: ProviderCapability[];

  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (events: HubEvent[]) => void): () => void;
  getStatus(): ProviderStatus;
}

type ProviderStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error";

interface ProviderCapability {
  kind: HubEventType;
  origin: "mock" | "native" | "hybrid";
  support: "available" | "preflight" | "unavailable";
}
```

The contract keeps provider ownership separate from hub rendering:

- Providers create `HubEvent` objects.
- The provider adapter forwards those events into the existing event bus.
- The store and resolver decide the current hub mode.
- The existing Hub UI renders the resolved mode.

## Event Flow

```text
Provider (mock or native)
  -> provider adapter (connectProviderToEventBus)
  -> publishHubEvent()
  -> store (createHubStoreState)
  -> resolver (resolveDesktopStatusState)
  -> Hub UI (status templates)
```

Validation target:

```text
MusicProvider event    -> adapter -> event bus -> resolver -> Media mode
DownloadProvider event -> adapter -> event bus -> resolver -> Download mode
AITaskProvider event   -> adapter -> event bus -> resolver -> AI Progress mode
NotificationProvider   -> adapter -> event bus -> resolver -> Notification mode
SystemProvider event   -> adapter -> event bus -> resolver -> Resident mode (metrics)
```

## Provider Registry

The registry (`ProviderRegistry`) tracks provider discovery, registration, health, and availability.

Key methods:

- `register(provider)` — Register a provider with its metadata and capabilities.
- `unregister(id)` — Remove a provider and clean up subscriptions.
- `get(id)` — Look up a registered provider.
- `list()` — List all registered providers.
- `listCapabilitySupport()` — Return copied capability facts per provider kind.
- `summarizeCapabilitySupport()` — Aggregate diagnostic capability support across providers.

Boundary rules:

- Registry health or availability does not mean an emitted event is active, complete, failed, or cleared.
- Registry state does not decide the current hub mode.
- Registry paths must publish `HubEvent` objects through the Event Bus before hub UI state changes.
- The Registry does not bypass the Event Bus, Store, or Resolver.

## Mock Providers

Four mock providers are implemented for development and showcase:

| Provider | Event Type | Description |
|----------|-----------|-------------|
| `MockMusicProvider` | `music` | Emits fake "Midnight City" playback events with progress |
| `MockDownloadProvider` | `download` | Emits fake file download progress events |
| `MockAITaskProvider` | `ai` | Emits fake AI generation task progress |
| `MockNotificationProvider` | `notification` | Emits fake notification events with expiry |

All mock providers use deterministic data from `mockHubData.ts` and support full lifecycle (start/stop/subscribe).

## Native Providers (In Progress)

### System Performance Provider (Connected, needs SDK wrapping)

- **Source**: Rust `sysinfo` crate via `get_system_performance` Tauri command
- **Data**: CPU usage %, memory usage %, network throughput %
- **Current path**: `systemPerformanceRuntime.ts` → `DesktopPage.tsx` (bypasses provider SDK)
- **Target**: Wrap as `SystemPerformanceProvider` implementing `HubProvider`

### Media Session Provider (Connected, needs SDK wrapping)

- **Source**: Windows GSMTC API via `get_media_session_status` Tauri command
- **Data**: Playback status (playing/paused), position (ms), duration (ms)
- **Current path**: `tauriRuntime.ts` → `DesktopPage.tsx` (bypasses provider SDK)
- **Target**: Wrap as `MediaSessionProvider` implementing `HubProvider`

### Planned Providers

| Provider | Source | Status |
|----------|--------|--------|
| Focus | Windows Focus Assist API | Not started |
| Clipboard | Windows `AddClipboardFormatListener` | Not started |
| Downloads | File system watcher / browser API | Not started |
| Notifications | Windows Notification Listener API | Not started |
| Developer tools | Git, Docker, WSL, build systems | Planned (Stage 6) |
| AI Agents | Codex, Claude, GPT agent sessions | Planned (Stage 7) |

## Privacy Boundaries

All providers must respect these privacy rules:

- Only coarse metrics are collected: CPU %, memory %, network throughput category.
- Media session exposes only playback status, position, and duration — not track metadata unless explicitly surfaced.
- No process lists, window titles, usernames, file paths, credentials, or hardware serials cross the IPC boundary.
- Diagnostic fields use bounded enums: `quality` (live/fallback/stale/unavailable), `code` (available/unsupported/permission-denied/etc.).
- Notification providers must not read private message content.
- File watchers must not expose full file paths or contents.
