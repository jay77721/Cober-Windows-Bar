import { mockHubEvents } from "../data/mockHubData";
import { createHubEventBus, type HubEventBus } from "../state/hubState";
import type { HubEvent, HubStoreState } from "../types/hub";
import {
  getTauriInvoke,
  loadTauriFixtureHubEvents,
  type TauriInvoke,
  type TauriRuntimeDiagnostic,
} from "./tauriRuntime";

export type DesktopStatusEventSource = "mock" | "tauri-fixture";

export type DesktopStatusEventsResult = {
  events: HubEvent[];
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
};

export type DesktopStatusRuntimeSnapshot = {
  state: HubStoreState;
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
};

export type DesktopStatusRuntime = {
  getSnapshot(now?: number): DesktopStatusRuntimeSnapshot;
  refresh(): Promise<DesktopStatusRuntimeSnapshot>;
  subscribe(subscriber: (snapshot: DesktopStatusRuntimeSnapshot) => void): () => void;
  dispose(): void;
};

type CreateDesktopStatusRuntimeOptions = {
  invoke?: TauriInvoke;
  fallbackEvents?: HubEvent[];
  eventBus?: HubEventBus;
};

const desktopStatusRuntimeCache = new WeakMap<TauriInvoke | typeof globalThis, DesktopStatusRuntime>();

export async function loadDesktopStatusEvents({
  invoke = getTauriInvoke(),
  fallbackEvents = mockHubEvents,
}: {
  invoke?: TauriInvoke;
  fallbackEvents?: HubEvent[];
} = {}): Promise<DesktopStatusEventsResult> {
  if (!invoke) {
    return {
      events: snapshotHubEvents(fallbackEvents),
      source: "mock",
    };
  }

  const result = await loadTauriFixtureHubEvents({ invoke });

  if (!result.ok) {
    return {
      events: snapshotHubEvents(fallbackEvents),
      source: "mock",
      diagnostic: result.diagnostic,
    };
  }

  return {
    events: snapshotHubEvents(result.events),
    source: "tauri-fixture",
  };
}

export function createDesktopStatusRuntime({
  invoke = getTauriInvoke(),
  fallbackEvents = mockHubEvents,
  eventBus = createHubEventBus(),
}: CreateDesktopStatusRuntimeOptions = {}): DesktopStatusRuntime {
  let source: DesktopStatusEventSource = "mock";
  let diagnostic: TauriRuntimeDiagnostic | undefined;
  let disposed = false;
  const snapshotFallbackEvents = snapshotHubEvents(fallbackEvents);
  const runtimeSubscribers = new Set<(snapshot: DesktopStatusRuntimeSnapshot) => void>();
  let unsubscribeBus: (() => void) | undefined;

  eventBus.replaceHubEvents(snapshotFallbackEvents);

  function snapshot(now?: number): DesktopStatusRuntimeSnapshot {
    return {
      state: eventBus.getState(now),
      source,
      diagnostic,
    };
  }

  function deliver(subscriber: (value: DesktopStatusRuntimeSnapshot) => void, value: DesktopStatusRuntimeSnapshot) {
    try {
      subscriber(value);
    } catch {
      // Desktop runtime subscriber failures should not block unrelated listeners.
    }
  }

  function notify() {
    const nextSnapshot = snapshot();
    runtimeSubscribers.forEach((subscriber) => deliver(subscriber, nextSnapshot));
  }

  unsubscribeBus = eventBus.subscribe(() => {
    if (disposed) {
      return;
    }

    notify();
  });

  async function refresh() {
    const result = await loadDesktopStatusEvents({ invoke, fallbackEvents: snapshotFallbackEvents });

    if (disposed) {
      return snapshot();
    }

    source = result.source;
    diagnostic = result.diagnostic;
    eventBus.replaceHubEvents(result.events);

    return snapshot();
  }

  return {
    getSnapshot(now) {
      return snapshot(now);
    },
    refresh,
    subscribe(subscriber) {
      runtimeSubscribers.add(subscriber);
      deliver(subscriber, snapshot());

      return () => {
        runtimeSubscribers.delete(subscriber);
      };
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      runtimeSubscribers.clear();
      unsubscribeBus?.();
      unsubscribeBus = undefined;
    },
  };
}

export function getDesktopStatusRuntime(options: CreateDesktopStatusRuntimeOptions = {}): DesktopStatusRuntime {
  if (options.eventBus || options.fallbackEvents || options.invoke) {
    return createDesktopStatusRuntime(options);
  }

  const key = getTauriInvoke() ?? globalThis;
  const cached = desktopStatusRuntimeCache.get(key);

  if (cached) {
    return cached;
  }

  const runtime = createDesktopStatusRuntime();
  desktopStatusRuntimeCache.set(key, runtime);
  return runtime;
}

function snapshotHubEvents(events: HubEvent[]): HubEvent[] {
  return events.map((event) => ({
    ...event,
    payload: event.payload ? { ...event.payload } : undefined,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  }));
}
