# Provider Lifecycle Plan

v0.5.0 is a planning-only milestone for the Mock Provider SDK lifecycle. It defines the lifecycle contract that future mock providers should follow, but it does not implement providers, adapters, Tauri, Rust, IPC, Windows APIs, background services, or system integrations.

v0.5.3 is documentation alignment only. v0.6 may implement mock providers only after v0.5.4 Review & Freeze accepts the aligned lifecycle, registry, event contract, and runtime path. Until then, this document is the source of planning expectations only.

## Lifecycle States

The provider lifecycle should be explicit, observable, and safe to call from tests, demo controls, future settings UI, and future desktop-shell hooks.

```text
Registered -> Started -> Publishing -> Paused -> Stopped
                         \-> Failed
```

Lifecycle is intentionally separate from provider health and from event or task status:

- Lifecycle values are only `Registered`, `Started`, `Publishing`, `Paused`, `Stopped`, and `Failed`.
- Health values are only `Healthy`, `Degraded`, and `Unhealthy`.
- Event delivery status, download progress, notification state, AI task state, and other domain statuses belong in HubEvents, not provider lifecycle.

### Registered

`Registered` means the provider is known to a future provider registry or adapter, but it has not opened resources or started producing events.

- Provider construction and registration should be cheap and side-effect free.
- Registration should expose static metadata such as provider id, name, kind, version, and mock/real source type.
- Registration metadata must not include resolver priority or display priority; priority policy belongs to the Resolver.
- Registration should not create timers, watchers, listeners, processes, IPC handles, network connections, or OS subscriptions.
- Subscribing to provider events should be allowed while registered, but it must not implicitly start the provider.
- A registered provider should be reusable across repeated `start()` and `stop()` cycles.

### Started

`Started` means `start()` has completed enough setup for the provider to produce coherent event output.

- `start()` should move the provider from `Registered` or `Stopped` into `Started` behavior.
- `start()` must be idempotent.
- Calling `start()` while already started or publishing should be a no-op.
- Calling `start()` while paused should resume active production only if the future contract defines `start()` as a resume alias; otherwise callers should use `resume()`.
- `start()` should not create duplicate timers, source listeners, subscriptions, handles, or pending work.
- A failed start should move the provider into `Failed` with a short diagnostic summary and `Unhealthy` health.

### Publishing

`Publishing` means the provider is actively emitting canonical `HubEvent` batches to current subscribers.

- Providers should publish arrays of events, even when a batch contains one event.
- Providers should not update React state, choose hub modes, or render UI.
- Providers should include enough source identity for diagnostics to trace events back to provider metadata.
- Providers should emit canonical HubEvents, not UI-specific state or view models.
- Mock providers should emit deterministic sequences so tests and screenshots are reproducible.
- A provider must not publish after stop, unsubscribe, or cleanup has taken effect.
- A provider should isolate listener failures so one broken listener does not break provider lifecycle or other listeners.

### Paused

`Paused` means event production is temporarily suspended without fully releasing reusable provider state.

- `pause()` must be idempotent.
- Calling `pause()` while already paused should be a no-op.
- Calling `pause()` while `Stopped` or only `Registered` should be a no-op unless a future supervisor chooses to report it as an invalid transition.
- Paused providers should not emit fresh domain events.
- Paused providers may keep lightweight reusable state, but they must not keep expensive work running if that work only exists to publish events.
- `resume()` must be idempotent and should return a paused provider to started or publishing behavior without duplicate resources.
- Calling `resume()` while already started or publishing should be a no-op.
- Calling `resume()` while `Stopped` should not implicitly allocate resources unless the future contract explicitly defines `resume()` as a `start()` alias.

### Stopped

`Stopped` means the provider has released active resources and will not publish more events until started again.

- `stop()` must be idempotent.
- Calling `stop()` while `Stopped` or `Registered` should be a no-op.
- Calling `stop()` while `Started`, `Publishing`, `Paused`, or `Failed` should release resources and settle the provider into `Stopped`.
- Stop should clear timers, detach listeners, abort or ignore pending async work, close provider-owned handles, and remove source subscriptions.
- Stop should leave the provider reusable so a later `start()` can begin from a clean baseline.
- Stop should not publish fresh domain events unless a future resolver contract explicitly supports terminal lifecycle events.

### Failed

`Failed` means the provider failed to start, failed while publishing, or encountered an unrecoverable source problem.

- Failed state should include a short diagnostic message and timestamp suitable for tests and future settings UI.
- Failure messages must not include secrets, credentials, full private content, notification bodies, command dumps, or unnecessary file paths.
- Entering failed should stop event production from the failed source path.
- `stop()` from `Failed` should clean up active resources and settle the provider into `Stopped`.
- `start()` after `Failed` may retry setup after cleanup rules have run.
- Automatic restart policy belongs to a future provider supervisor, not individual mock providers.

## Health Model

Provider health describes reliability, not lifecycle phase.

- `Healthy`: The provider is operating normally for its current lifecycle.
- `Degraded`: The provider is still usable but has recoverable source issues, partial capability loss, stale data, or rate-limited output.
- `Unhealthy`: The provider cannot reliably run or publish and may need explicit recovery.

Health must not be used for task progress or domain event state. For example, a download can be `failed` as a HubEvent payload while the download provider remains `Healthy`.

## Idempotent Operations

Lifecycle operations must be safe under repeated calls. This protects future tests, hot reload, settings toggles, desktop-shell events, and provider supervision from duplicate output or leaked resources.

| Operation | Required behavior |
| --- | --- |
| `start()` | Repeated calls must not create duplicate timers, watchers, listeners, handles, subscriptions, promises, or event streams. |
| `stop()` | Repeated calls must be safe and leave the provider `Stopped` with resources released. |
| `pause()` | Repeated calls must keep the provider paused without changing counters, timers, or subscriptions unexpectedly. |
| `resume()` | Repeated calls must not duplicate publishing loops or replay unintended stale events. |
| `unsubscribe()` | Repeated calls must remove the listener once and then become no-ops. |

Idempotency is part of the contract, not a convenience. Future mock providers should have lifecycle tests that call these methods multiple times in different states.

## Subscribe and Unsubscribe

`subscribe(listener)` should register a listener for future event batches and return an `unsubscribe()` function.

- Subscribe should not start, pause, resume, or stop the provider.
- Subscribe should not replay old events unless replay is added as an explicit future feature.
- Duplicate subscriptions from the same callback may be treated as separate registrations unless a future registry chooses to dedupe them.
- `unsubscribe()` must be idempotent.
- Unsubscribed listeners must not receive future events.
- Unsubscribe during event delivery should not corrupt the listener list or skip unrelated listeners.
- Provider cleanup should unsubscribe adapter-owned listeners when an adapter is disabled or disposed.

## Cleanup and Resource Release Rules

Every provider must release the resources it creates. Mock providers should follow the same discipline expected from future real providers.

- Timers and intervals are cleared on stop.
- Pending scheduled ticks are cancelled or ignored after stop.
- Source listeners and provider-owned subscriptions are detached on stop.
- In-flight async work is aborted when possible or ignored when it completes after stop.
- Listener collections are cleared when the provider is disposed by a future registry or supervisor.
- Paused providers should suspend publishing work and avoid keeping active loops alive only to drop their output.
- Stopped providers must not keep background work running.
- Cleanup should be safe to run after partial startup failure.
- Cleanup should be safe to run more than once.
- Tests should prove no events are emitted after stop, pause, or unsubscribe where applicable.

Future real providers may add resource-specific rules for OS handles, file watchers, media-session readers, child processes, IPC channels, network sockets, or credentials. Those implementation rules are out of scope for v0.5.0.

## Stop-After-Publish Expectations

`stop()` may be called immediately after a provider publishes an event batch.

- Events already synchronously delivered before `stop()` may remain valid hub input.
- Events scheduled but not yet delivered must be cancelled or ignored.
- No new domain events should be emitted after stop completes.
- Stop should not wait on unnecessary publish loops once resource cleanup is complete.
- A later `start()` should not replay stale stop-time events unless explicit replay support is added later.
- Tests should cover publish, stop, tick/flush again, and assert no additional events are received.

## Pause-After-Publish Expectations

`pause()` may be called immediately after a provider publishes an event batch.

- Events already synchronously delivered before `pause()` may remain valid hub input.
- Events scheduled but not yet delivered should be cancelled, deferred, or ignored according to the provider's documented mock sequence behavior.
- Paused providers should not emit fresh domain events until `resume()`.
- `resume()` should continue from a deterministic point for mock providers.
- `pause()` should not release all reusable state unless the provider documents pause as equivalent to stop.
- Tests should cover publish, pause, tick/flush again, assert no new events, resume, and assert deterministic continuation.

## v0.5.0 Non-Goals

v0.5.0 does not include:

- MockMusicProvider, MockAIProvider, MockDownloadProvider, or MockNotificationProvider implementation
- provider registry implementation
- provider adapter implementation
- event bus changes
- React, store, resolver, or UI changes
- Tauri, Rust, IPC, tray, always-on-top, or desktop-shell behavior
- Windows/system API access
- media-session readers, file watchers, notification-center readers, command execution, or external service integration
- changes under `src/`, `src/providers/`, `src/state/`, `src-tauri/`, `scripts/`, assets, or package metadata

The only v0.5.0 output intended by this document is lifecycle planning.

## v0.6 Implementation Candidates

If v0.5.4 approves the freeze, v0.6 implementation should begin with lifecycle tests before provider behavior grows.

Suggested first implementation checks:

1. Register mock provider metadata without side effects.
2. Start twice and prove only one publishing loop exists.
3. Subscribe, publish, unsubscribe twice, and prove the listener receives no later events.
4. Pause after publish and prove no events emit while paused.
5. Resume twice and prove deterministic continuation without duplicate events.
6. Stop after publish and prove cleanup prevents later events.
7. Trigger a mock failure and prove stop cleans up and a later start can retry.

The v0.6 mock provider list, event fixtures, adapter shape, and test files should remain blocked until v0.5.4 confirms there are no open documentation contradictions.
