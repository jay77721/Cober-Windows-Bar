import { mockHubEvents } from "../data/mockHubData";
import { isRecord, parseHubEvents, snapshotHubEvent } from "../shared/runtimeGuards";
import { createHubEventBus, type HubEventBus } from "../state/hubState";
import type { HubEvent, HubStoreState } from "../types/hub";
import {
  getTauriInvoke,
  loadTauriFixtureHubEvents,
  type TauriInvoke,
  type TauriRuntimeDiagnostic,
} from "./tauriRuntime";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";

export const DESKTOP_STATUS_INPUT_EVENT = "status-center://hub-events";

type DesktopStatusEventSource = "mock" | "tauri-fixture" | "tauri-event";
type DesktopStatusRuntimeQuality = "live" | "fallback" | "stale";

type DesktopStatusRuntimeSourceStatus = {
  activeSource: DesktopStatusEventSource;
  lastSuccessfulSource?: Exclude<DesktopStatusEventSource, "mock">;
  quality: DesktopStatusRuntimeQuality;
  fallbackReason?: TauriRuntimeDiagnostic["code"];
};

type DesktopStatusEventsResult = {
  events: HubEvent[];
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
};

export type DesktopStatusRuntimeSnapshot = {
  state: HubStoreState;
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
  sourceStatus: DesktopStatusRuntimeSourceStatus;
};

export type DesktopStatusRuntime = {
  getSnapshot(now?: number): DesktopStatusRuntimeSnapshot;
  refresh(): Promise<DesktopStatusRuntimeSnapshot>;
  subscribe(subscriber: (snapshot: DesktopStatusRuntimeSnapshot) => void): () => void;
  dispose(): void;
};

type DesktopStatusEventListener = (
  events: HubEvent[],
  source?: DesktopStatusEventSource,
  diagnostic?: TauriRuntimeDiagnostic,
) => void;

type DesktopStatusEventListenerUnsubscribe = () => void;

type DesktopStatusEventListenerSource = (
  listener: DesktopStatusEventListener,
) => DesktopStatusEventListenerUnsubscribe | Promise<DesktopStatusEventListenerUnsubscribe>;

type DesktopStatusTauriListen = (
  event: string,
  handler: (event: Event<unknown>) => void | Promise<void>,
) => Promise<UnlistenFn>;

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}

type CreateDesktopStatusRuntimeOptions = {
  invoke?: TauriInvoke;
  fallbackEvents?: HubEvent[];
  loadFixtureEvents?: boolean;
  eventBus?: HubEventBus;
  subscribeToEvents?: DesktopStatusEventListenerSource;
  tauriListen?: DesktopStatusTauriListen;
};

const desktopStatusRuntimeCache = new WeakMap<TauriInvoke | typeof globalThis, DesktopStatusRuntime>();

export async function loadDesktopStatusEvents({
  invoke = getTauriInvoke(),
  fallbackEvents = mockHubEvents,
  loadFixtureEvents = true,
}: {
  invoke?: TauriInvoke;
  fallbackEvents?: HubEvent[];
  loadFixtureEvents?: boolean;
} = {}): Promise<DesktopStatusEventsResult> {
  if (!invoke || !loadFixtureEvents) {
    return {
      events: fallbackEvents.map(snapshotHubEvent),
      source: "mock",
    };
  }

  const result = await loadTauriFixtureHubEvents({ invoke });

  if (!result.ok) {
    return {
      events: fallbackEvents.map(snapshotHubEvent),
      source: "mock",
      diagnostic: result.diagnostic,
    };
  }

  return {
    events: result.events.map(snapshotHubEvent),
    source: "tauri-fixture",
  };
}

export function createDesktopStatusRuntime({
  invoke = getTauriInvoke(),
  fallbackEvents = mockHubEvents,
  loadFixtureEvents = true,
  eventBus = createHubEventBus(),
  subscribeToEvents,
  tauriListen,
}: CreateDesktopStatusRuntimeOptions = {}): DesktopStatusRuntime {
  let source: DesktopStatusEventSource = "mock";
  let diagnostic: TauriRuntimeDiagnostic | undefined;
  let lastSuccessfulSource: Exclude<DesktopStatusEventSource, "mock"> | undefined;
  let disposed = false;
  const snapshotFallbackEvents = fallbackEvents.map(snapshotHubEvent);
  const runtimeSubscribers = new Set<(snapshot: DesktopStatusRuntimeSnapshot) => void>();
  let unsubscribeBus: (() => void) | undefined;
  let unsubscribePushSource: (() => void) | undefined;
  const eventSourceSubscription =
    subscribeToEvents ?? (invoke ? createTauriDesktopStatusEventSource({ tauriListen }) : undefined);

  eventBus.replaceHubEvents(snapshotFallbackEvents);

  function snapshot(now?: number): DesktopStatusRuntimeSnapshot {
    const sourceStatus = createSourceStatus({
      source,
      diagnostic,
      lastSuccessfulSource,
    });

    return {
      state: eventBus.getState(now),
      source,
      diagnostic,
      sourceStatus,
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

  if (eventSourceSubscription) {
    const subscription = eventSourceSubscription((events, nextSource = "tauri-fixture", nextDiagnostic) => {
      if (disposed) {
        return;
      }

      source = nextSource;
      diagnostic = nextDiagnostic;
      if (nextSource !== "mock") {
        lastSuccessfulSource = nextSource;
      }
      eventBus.replaceHubEvents(events.map(snapshotHubEvent));
    });

    if (isPromiseLike(subscription)) {
      void subscription.then((unsubscribe) => {
        if (disposed) {
          unsubscribe();
          return;
        }

        unsubscribePushSource = unsubscribe;
      });
    } else {
      unsubscribePushSource = subscription;
    }
  }

  async function refresh() {
    const result = await loadDesktopStatusEvents({
      invoke,
      fallbackEvents: snapshotFallbackEvents,
      loadFixtureEvents,
    });

    if (disposed) {
      return snapshot();
    }

    source = result.source;
    diagnostic = result.diagnostic;
    if (result.source !== "mock") {
      lastSuccessfulSource = result.source;
    }
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
      unsubscribePushSource?.();
      unsubscribePushSource = undefined;
    },
  };
}

export function createTauriDesktopStatusEventSource({
  tauriListen = listen,
}: {
  tauriListen?: DesktopStatusTauriListen;
} = {}): DesktopStatusEventListenerSource {
  return async (listener) => {
    try {
      return await tauriListen(DESKTOP_STATUS_INPUT_EVENT, async (event) => {
        const result = parseDesktopStatusInputEventPayload(event.payload);
        if (!result) {
          return;
        }

        listener(result.events, "tauri-event");
      });
    } catch {
      return () => {
        // Keep refresh/fallback flows available when the Tauri event bridge is absent.
      };
    }
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

function parseDesktopStatusInputEventPayload(
  value: unknown,
): { events: HubEvent[] } | undefined {
  const rawArray = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.events)
      ? value.events
      : undefined;

  if (!rawArray) {
    return undefined;
  }

  const events = parseHubEvents(rawArray).map(snapshotHubEvent);

  if (events.length !== rawArray.length) {
    return undefined;
  }

  return { events };
}

function createSourceStatus({
  source,
  diagnostic,
  lastSuccessfulSource,
}: {
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
  lastSuccessfulSource?: Exclude<DesktopStatusEventSource, "mock">;
}): DesktopStatusRuntimeSourceStatus {
  if (source !== "mock") {
    return {
      activeSource: source,
      lastSuccessfulSource: source,
      quality: "live",
    };
  }

  if (diagnostic && lastSuccessfulSource) {
    return {
      activeSource: source,
      lastSuccessfulSource,
      quality: "stale",
      fallbackReason: diagnostic.code,
    };
  }

  if (diagnostic) {
    return {
      activeSource: source,
      lastSuccessfulSource,
      quality: "fallback",
      fallbackReason: diagnostic.code,
    };
  }

  return {
    activeSource: source,
    lastSuccessfulSource,
    quality: "fallback",
  };
}

