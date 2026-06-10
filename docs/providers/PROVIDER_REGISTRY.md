# Provider Registry

Status: v0.7 diagnostic alignment (updated for v0.8 progress). This document began as v0.5.0 planning for the Mock Provider SDK; the current project now includes a narrow local registry plus read-only capability diagnostic read models. The Tauri Rust backend now implements real Windows API integration (system performance, media session, window management, tray), documented in `docs/architecture/TAURI_STRATEGY.md`. This registry document's scope remains the registry abstraction layer and does not define runtime wiring, IPC, Tauri commands, Windows APIs, real providers, or concrete native provider behavior.

## Purpose

The provider registry is the local coordination layer for discovering, storing, querying, and lifecycle-controlling providers exposed through the Mock Provider SDK. It gives tests and future diagnostic surfaces one place to ask which providers exist, what they can do, what lifecycle phase they are in, and how healthy they are.

The registry is a local SDK concept. It must remain independent from platform integration details so future provider implementations can be mocked, simulated, or replaced without changing registry semantics. Native-looking capability facts are diagnostic descriptors only unless a later slice separately implements a real provider.

## Responsibilities

- Store registered provider records by stable provider id.
- Expose provider id, name, group, capabilities, lifecycle, health, metadata, privacy declarations, and registration order.
- Provide lookup and listing APIs for UI, orchestration, and tests.
- Expose copied capability support rows through `listCapabilitySupport()`.
- Expose aggregated capability support diagnostics through `summarizeCapabilitySupport()`.
- Coordinate conceptual lifecycle transitions such as start, stop, pause, and resume.
- Support bulk lifecycle operations across all registered providers.
- Detect duplicate provider ids and apply a deterministic conflict policy.
- Group providers by broad product area so callers can filter by domain.
- Keep enough state for mock providers to model provider availability without requiring real system integration.

## Non-Responsibilities

- Implement provider behavior such as music playback, AI responses, download management, or notification delivery.
- Create MockMusicProvider, MockAIProvider, MockDownloadProvider, or MockNotificationProvider.
- Call Tauri, Rust, IPC, Windows, shell, network, file-system, or system-tray APIs.
- Persist providers across app launches.
- Own user authentication, secret storage, permission prompts, or account linking.
- Decide final production provider contracts beyond the v0.5.0 planning scope.
- Replace domain-specific provider logic; providers still own their own behavior.
- Convert provider output into UI-specific state.
- Bypass the Provider -> Event Bus -> Store -> Resolver -> UI runtime path.
- Do not treat `origin: "native"` plus `support: "preflight"` as a real Windows/Music provider.
- Do not report native provider readiness, connection, activity, or production capability.

## Current Diagnostic API

The current v0.7 diagnostic surface is read-only and local. It returns copied facts; it must not expose provider objects, mutate registry entries, start providers, subscribe to providers, emit events, call native APIs, or wire runtime capability checks into the registry.

### `listCapabilitySupport()`

Returns copied provider capability support rows.

Current row shape:

```ts
{
  providerId: string;
  providerName: string;
  providerKind: ProviderKind;
  registrationOrder: number;
  capability: HubProviderCapability;
}
```

The `capability` object is copied from the provider snapshot. Callers can inspect `id`, `kind`, `origin`, and `support` without receiving a mutable provider reference.

### `summarizeCapabilitySupport()`

Aggregates copied capability support rows by `kind`, `origin`, and `support`.

Current summary shape:

```ts
{
  kind: ProviderKind;
  origin: "mock" | "native";
  support: "available" | "unsupported" | "preflight";
  capabilityCount: number;
  providerCount: number;
  providerIds: string[];
}
```

The summary preserves first-seen bucket order and copies `providerIds` for each call. It intentionally excludes lifecycle, health, readiness, connection, provider object, adapter, store, resolver, event bus, runtime, and native availability fields.

Current diagnostic interpretation:

- Mock providers may report `origin: "mock"` and `support: "available"`.
- Future-facing native capability descriptors may report `origin: "native"` and `support: "preflight"`.
- Native/music `preflight` facts are not a Windows Media implementation, not a provider startup result, and not proof that native provider behavior exists.

## Local Registry API

The names below describe the local registry surface and remaining planning concepts. Where code exists, it remains in-memory and test-focused. Where future behavior is described, it is still conceptual and must not be read as native/runtime implementation approval.

### `register(provider)`

Adds a provider record to the registry.

Expected planning behavior:

- Validate that the provider has a stable id, group, metadata, capabilities, privacy fields, and runtime fields.
- Reject or resolve duplicate ids according to the duplicate id policy.
- Make the provider visible through `get` and `list` after successful registration.

### `unregister(providerId)`

Removes a provider record from the registry.

Expected planning behavior:

- Stop or mark inactive any provider that is currently `Started`, `Publishing`, or `Paused` before removal.
- Remove the provider from lookup and list results.
- Treat unknown ids as a no-op or typed result, depending on the final SDK error model.

### `get(providerId)`

Returns one registered provider record by id.

Expected planning behavior:

- Return the provider record when found.
- Return an empty result, typed error, or nullable value when not found; the final shape is deferred.

### `list(filter?)`

Returns registered provider records.

Expected planning behavior:

- Support listing all providers.
- Support filtering by group, capability, privacy attribute, availability, lifecycle, and health.
- Preserve deterministic ordering, with registration order available as the stable fallback.

### `start(providerId)`

Requests that one provider enter an active lifecycle state.

Expected planning behavior:

- Validate that the provider is registered.
- Transition eligible providers from `Stopped` or `Paused` into `Started` or `Publishing`.
- Surface unsupported, unavailable, or failed starts through typed results in the future SDK.

### `stop(providerId)`

Requests that one provider enter the `Stopped` lifecycle state.

Expected planning behavior:

- Validate that the provider is registered.
- Transition started, publishing, paused, or failed providers to `Stopped`.
- Allow repeated stop calls to be idempotent.

### `pause(providerId)`

Requests that one provider temporarily suspend active work.

Expected planning behavior:

- Validate that the provider is registered and supports pause.
- Transition eligible started or publishing providers to `Paused`.
- Leave unsupported providers unchanged and report the unsupported operation through the future result model.

### `resume(providerId)`

Requests that one paused provider continue active work.

Expected planning behavior:

- Validate that the provider is registered.
- Transition eligible paused providers to `Started` or `Publishing`.
- Treat resume on `Stopped` or unavailable providers as a typed no-op or failure result, to be finalized later.

### `startAll(filter?)`

Requests that every matching provider start.

Expected planning behavior:

- Apply optional group or capability filters before starting.
- Return per-provider results rather than failing the whole operation on the first error.
- Avoid starting providers marked disabled, unavailable, or incompatible.

### `stopAll(filter?)`

Requests that every matching provider stop.

Expected planning behavior:

- Apply optional group or capability filters before stopping.
- Return per-provider results.
- Be safe to call repeatedly.

## Provider Record Shape

Provider records should be explicit enough for UI and tests to reason about provider identity, supported behavior, privacy posture, lifecycle, health, and deterministic ordering.

## Registry Matrix

The registry should know these details for every provider:

| Area | Registry-owned details |
| --- | --- |
| Identity | Stable `id`, human-readable `name`, primary `group`, and deterministic `registrationOrder`. |
| Capabilities | Capability ids, provider kind, capability origin, support state, optional features, conceptual commands, conceptual events, pause support, and bulk lifecycle support. |
| Lifecycle | One lifecycle value: `Registered`, `Started`, `Publishing`, `Paused`, `Stopped`, or `Failed`. |
| Health | One health value: `Healthy`, `Degraded`, or `Unhealthy`. |
| Metadata | Description, version, author, homepage, tags, mock/real declaration, and review-facing metadata. |
| Privacy | Declared data access, writes, network access, local storage, sensitive data, and privacy notes. |

These details remain provider-private:

- Source handles, watchers, timers, sockets, processes, IPC handles, subscriptions, and file descriptors.
- Raw notification text, transcript content, command output, filenames, paths, credentials, tokens, and account details.
- Mock fixture internals, scenario cursors, retry counters, parser state, cache contents, and source-specific client objects.
- UI-specific derived state, view models, layout choices, and final hub mode decisions.

The registry may expose summaries and diagnostics, but it should not leak provider internals. Providers emit canonical HubEvents into the runtime path, and the Event Bus, Store, and Resolver remain responsible for application state flow after that boundary.

### Metadata Fields

- `id`: Stable unique provider identifier, such as `mock.music.local`.
- `group`: Provider group, such as `music`, `ai`, `download`, or `notification`.
- `name`: Human-readable display name.
- `description`: Short provider summary for settings and debugging surfaces.
- `version`: Provider contract or mock implementation version.
- `author`: Optional provider author, package, or owning team.
- `homepage`: Optional documentation or product URL.
- `tags`: Optional labels for search and filtering.

### Capability Fields

- `capabilities`: Stable capability ids exposed by the provider.
- `kind`: Broad product surface for the capability, such as `music`, `ai`, `download`, or `notification`.
- `origin`: Whether the capability fact describes a `mock` source or a future-facing `native` source.
- `support`: Current support descriptor. Mock capabilities may be `available`; native/music diagnostics should remain `preflight` until a later real provider slice proves otherwise.
- `features`: Optional feature flags or named behaviors within a capability.
- `commands`: Optional high-level command ids the provider can conceptually handle.
- `events`: Optional event ids the provider can conceptually emit.
- `supportsPause`: Whether `pause` and `resume` should be offered.
- `supportsBulkLifecycle`: Whether the provider can participate in `startAll` and `stopAll`.

Example capability areas:

- Music: playback, queue, library, now-playing state, volume.
- AI: chat, completion, embedding, summarization, tool-call simulation.
- Download: enqueue, progress, pause, resume, cancel, history.
- Notification: send, schedule, dismiss, action handling.

### Privacy Fields

- `dataAccess`: Declared categories of data the provider may read.
- `dataWrites`: Declared categories of data the provider may create or modify.
- `networkAccess`: Whether the provider expects network access; mock providers should normally declare no real network use.
- `localStorage`: Whether the provider expects local persistence.
- `sensitiveData`: Whether credentials, personal data, or private content may be involved.
- `privacyNotes`: Human-readable clarification for review and settings surfaces.

Privacy fields are declarations, not enforcement, in the v0.5.0 planning model.

### Runtime Fields

- `lifecycle`: Conceptual lifecycle state, limited to `Registered`, `Started`, `Publishing`, `Paused`, `Stopped`, or `Failed`.
- `health`: Provider health, limited to `Healthy`, `Degraded`, or `Unhealthy`.
- `enabled`: Whether the provider is allowed to participate in lifecycle operations.
- `available`: Planned future environment availability field. Current v0.7 capability diagnostics use `support` facts instead and must not treat native/music `preflight` as current provider availability.
- `registrationOrder`: Monotonic order assigned when the provider is registered.
- `lastStartedAt`: Optional timestamp for the most recent successful start.
- `lastStoppedAt`: Optional timestamp for the most recent stop.
- `lastError`: Optional structured error summary.

Runtime fields are intended for mockable state transitions. They should not imply real process, service, or OS lifecycle management in v0.5.0.

Lifecycle and health must remain separate from event or task status. Download progress, notification delivery state, AI task state, and other domain statuses belong in HubEvents, not registry lifecycle.

Capability `support` must also remain separate from lifecycle and health. A native/music `preflight` capability fact says the boundary can represent the future capability; it does not say a native provider has started, connected, emitted events, or observed the operating system.

## Duplicate Id Handling

Provider ids must be unique within one registry instance. Duplicate id handling should be deterministic so tests and future UI behavior are predictable.

Planned policy:

- `register` should detect when the incoming provider id already exists.
- The default behavior should reject the duplicate and preserve the existing provider unchanged.
- The rejected result should identify the conflicting id and existing provider metadata.
- Replacement should require an explicit future option, such as `replace: true`, rather than happening implicitly.
- Duplicate ids across different groups should still conflict; the id is globally unique, not group-scoped.

This keeps accidental collisions visible and avoids silently changing provider behavior at runtime.

## Provider Groups

Groups are broad registry categories used for filtering, settings organization, and bulk operations. A provider belongs to one primary group.

### v0.5.0 Planning Groups

- `music`: Providers that model playback, queues, libraries, now-playing state, and audio-adjacent controls.
- `ai`: Providers that model chat, generation, summarization, embeddings, tool use, or agent-facing model behavior.
- `download`: Providers that model download queues, progress, pausing, resuming, cancellation, and history.
- `notification`: Providers that model notifications, scheduling, dismissal, actions, and delivery status.

### Future Groups

- `system`: Providers that may eventually model OS or device-adjacent capabilities.
- `developer`: Providers that may eventually model build, test, diagnostics, source control, or developer workflow capabilities.
- `agent`: Providers that may eventually model autonomous task runners, planning agents, orchestration, or background assistants.

Future groups are placeholders only. They do not grant permission to add system, developer, agent, Tauri, Rust, IPC, Windows, or background-process implementation in v0.5.0.

## Current Boundary

The registry may own local in-memory provider records, lifecycle snapshots for mock providers, and copied capability diagnostic read models.

No registry slice should add:

- Runtime-provider wiring.
- Provider adapter expansion.
- Store, Resolver, Event Bus, UI, or Showcase behavior.
- Real provider implementations.
- Tauri commands, Rust structs, IPC channels, Windows integrations, or background services.
- Package scripts, dependency changes, assets, or generated files.

The next implementation step, after separate planning approval, should stay narrow and testable. Native provider implementation remains outside this registry diagnostic boundary.
