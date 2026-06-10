# Test Strategy

## Scope

This document defines the test strategy for Cober-Windows-Bar. It covers both the implemented test suites and the planned test coverage for upcoming provider work.

## Current Test Suites

The project has 16 test files organized by layer:

### State Tests

- `src/state/hubState.test.ts` — Event bus publish/subscribe, store snapshot, mode resolution, scenario resolution, expiry, clear-to-idle, playback order.
- `src/state/desktopStatusScheduler.test.ts` — Priority scheduling, preferred-kind pinning, user interaction lock, guest cooldown, attention tracking.
- `src/state/desktopStatusState.test.ts` — State resolution, template merging, source health integration.
- `src/state/desktopStatusAggregation.test.ts` — Event aggregation, active kind detection, attention scoring.

### Provider Tests

- `src/providers/provider.test.ts` — Mock provider lifecycle, event emission, adapter integration.
- `src/providers/providerRegistry.test.ts` — Registration, lookup, removal, lifecycle tracking, capability support summaries.
- `src/providers/systemStatusDiagnostics.test.ts` — Diagnostic vocabulary, quality/code classification.

### Runtime Tests

- `src/runtime/tauriRuntime.test.ts` — IPC bridge, fixture loading, capability detection, malformed data handling, error classification, media session conversion.
- `src/runtime/desktopStatusInputRuntime.test.ts` — Three-tier source selection, polling behavior, fallback logic.
- `src/runtime/systemPerformanceRuntime.test.ts` — Metrics normalization, quality tracking (live/fallback/stale/unavailable), last-source contract.
- `src/runtime/desktopProductRuntime.test.ts` — Menu action, settings, open-settings event listeners.
- `src/runtime/statusWindowRuntime.test.ts` — Overlay state, floating policy, position correction.

### UI Tests

- `src/features/desktop/templates/ResidentStatusTemplate.test.ts` — Resident status template rendering.

### Data Tests

- `src/data/mockHubData.test.ts` — Mock data integrity, scenario fixtures.

## Running Tests

```bash
npm run qa                    # Full QA: all tests + showcase interactions + build
npm run test:state            # State management tests only
npm run test:providers        # Provider tests only
npm run test:runtime          # Runtime bridge tests only
npm run qa:showcase:interactions  # Showcase interaction QA only
npm run build                 # Production build (type-check)
```

## Test Principles

### Lifecycle Tests

Validate provider state transitions and emitted lifecycle events:

- Provider starts from idle/stopped and reaches running state.
- Running provider can be stopped and reaches stopped state.
- Start and stop emit expected lifecycle notifications in order.
- Failed start surfaces error state without leaving provider marked as running.
- Failed stop preserves enough state for cleanup awareness.
- Repeated lifecycle operations preserve provider identity, metadata, and subscriptions.

### Registry Tests

Validate provider registration, lookup, and removal:

- Registering stores id, display metadata, capability metadata, and initial lifecycle state.
- Lookup by id returns the same logical provider record.
- Listing includes registered providers exactly once.
- Removing makes provider unavailable for lookup and list.
- Operations reject invalid or incomplete records.
- State remains consistent when lifecycle operations update status.

### Cleanup Tests

Validate resource release on stop or removal:

- Stopping releases active timers, pending progress emitters, and queued work.
- Removing clears subscriptions and prevents future events.
- Cleanup is idempotent.
- Cleanup after failed start does not throw.
- Cleanup does not affect unrelated providers or subscribers.

### Duplicate Start Tests

Validate concurrent or repeated start handling:

- Starting a running provider does not create a second instance.
- Concurrent starts resolve to one running state.
- Duplicate starts do not duplicate subscriptions, timers, or emitters.
- Caller receives stable result for duplicate attempts.
- No extra running notifications beyond expected lifecycle sequence.

### Subscription Tests

Validate event subscription, delivery, and unsubscription:

- Subscribers receive events for their provider/channel.
- Subscribers do not receive events from unrelated providers.
- Multiple subscribers receive the same event without cross-contamination.
- Unsubscribed listeners stop receiving future events.
- Subscription cleanup occurs on provider stop or removal.
- Subscriber errors do not prevent delivery to others.

### Notification Expiry Tests

Validate notification time-to-live:

- Notifications with expiry remain visible until expiry time.
- Expired notifications are removed from active list.
- Expiry cleanup does not remove non-expired notifications.
- Manual dismissal prevents expiry reintroduction.
- Provider cleanup cancels pending expiry work.

### Progress Sequence Tests

Validate progress update order and completeness:

- Progress begins with initial event identifying operation and provider.
- Progress values move forward monotonically.
- Final event indicates completion, cancellation, or failure.
- Completion events do not precede required intermediate state.
- Failed operations stop emitting success progress.
- Parallel operations keep progress identifiers distinct.

### Event Spam and Backpressure Tests

Validate high-volume event stream handling:

- Rapid emission does not crash registry, dispatcher, or notification store.
- Queues/buffers/coalescing remain within bounds.
- Slow subscribers do not block lifecycle cleanup.
- Dropped/coalesced/throttled events are observable through diagnostics.
- Backpressure preserves terminal lifecycle and progress events.
- Spam from one provider does not starve others.

## Planned Test Additions

### Native Provider Tests (Stage 5)

As system performance and media session get wrapped into Provider SDK implementations:

- `SystemPerformanceProvider` lifecycle and event emission tests.
- `MediaSessionProvider` lifecycle and GSMTC data conversion tests.
- Provider registry integration with native providers.
- Mock fallback behavior when Tauri is unavailable.

### New Provider Tests (Stage 5 continued)

For each new provider (Focus, Clipboard, Downloads, Notifications):

- Provider lifecycle tests (start/stop/health).
- Data normalization tests.
- Privacy boundary tests (no forbidden data in events).
- Error handling and graceful degradation.
- Registry integration.

### Integration Tests (Stage 5+)

- End-to-end: Rust command → Tauri IPC → runtime adapter → event bus → store → resolver → UI state.
- Multi-provider concurrent operation.
- Provider failure isolation (one provider failing does not affect others).
