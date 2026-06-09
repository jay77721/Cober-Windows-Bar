import type { HubEvent, HubMode, HubStoreState, HubTask } from "../types/hub";

const taskAccentMap = {
  music: "pink",
  ai: "blue",
  download: "green",
  notification: "cyan",
} as const;

const clampProgress = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0);
const isFiniteNumber = (value: number | undefined) => typeof value === "number" && Number.isFinite(value);

export function getActiveHubEvents(events: HubEvent[], now = Date.now()) {
  return events
    .filter(
      (event) =>
        isFiniteNumber(event.createdAt) &&
        (event.expiresAt === undefined || (isFiniteNumber(event.expiresAt) && event.expiresAt > now)),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

function snapshotHubEvent(event: HubEvent): HubEvent {
  return {
    ...event,
    payload: event.payload ? { ...event.payload } : undefined,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}

export function resolveHubMode(events: HubEvent[], now = Date.now()): HubMode {
  const activeEvents = getActiveHubEvents(events, now);

  if (activeEvents.length === 0) {
    return "idle";
  }

  if (activeEvents.some((event) => event.type === "notification")) {
    return "notification";
  }

  const taskEvents = activeEvents.filter((event) => event.type !== "notification");

  if (taskEvents.length > 1) {
    return "multiTask";
  }

  const [event] = taskEvents;

  if (!event) {
    return "idle";
  }

  if (event.type === "ai") {
    return "aiProgress";
  }

  return event.type;
}

export function eventToTask(event: HubEvent): HubTask {
  const payload = event.payload && "title" in event.payload ? event.payload : undefined;
  const shouldDefaultProgress = event.type === "ai" || event.type === "download";

  return {
    id: event.id,
    type: event.type,
    title: payload?.title ?? event.type,
    subtitle: payload?.subtitle ?? "",
    progress:
      event.progress === undefined
        ? shouldDefaultProgress
          ? 0
          : undefined
        : clampProgress(event.progress),
    accent: taskAccentMap[event.type],
  };
}

export function createHubStoreState(events: HubEvent[], now = Date.now()): HubStoreState {
  const activeEvents = getActiveHubEvents(events, now).map(snapshotHubEvent);
  const mode = resolveHubMode(activeEvents, now);
  const tasks = activeEvents.filter((event) => event.type !== "notification").map(eventToTask);
  const notificationEvent = activeEvents.find((event) => event.type === "notification");
  const musicEvent = activeEvents.find((event) => event.type === "music");

  return {
    events: activeEvents,
    mode,
    tasks,
    notification:
      notificationEvent && notificationEvent.payload && "message" in notificationEvent.payload
        ? { ...notificationEvent.payload }
        : undefined,
    music:
      musicEvent && musicEvent.payload && "time" in musicEvent.payload
        ? { ...musicEvent.payload, progress: clampProgress(musicEvent.payload.progress) }
        : undefined,
  };
}

export type HubEventBus = {
  getState(now?: number): HubStoreState;
  publishHubEvent(event: HubEvent): void;
  replaceHubEvents(events: HubEvent[]): void;
  clearHubEvents(): void;
  clearExpiredEvents(now?: number): void;
  subscribe(subscriber: (state: HubStoreState) => void): () => void;
};

export function createHubEventBus(initialEvents: HubEvent[] = []): HubEventBus {
  let events = initialEvents.map(snapshotHubEvent);
  const subscribers = new Set<(state: HubStoreState) => void>();

  function snapshot(now = Date.now()) {
    return createHubStoreState(events, now);
  }

  function deliver(subscriber: (state: HubStoreState) => void, state: HubStoreState) {
    try {
      subscriber(state);
    } catch {
      // Subscriber failures should not prevent unrelated listeners from receiving state.
    }
  }

  function notify() {
    const state = snapshot();
    subscribers.forEach((subscriber) => deliver(subscriber, state));
  }

  return {
    getState: snapshot,
    publishHubEvent(event: HubEvent) {
      events = [snapshotHubEvent(event), ...events.filter((item) => item.id !== event.id)];
      notify();
    },
    replaceHubEvents(nextEvents: HubEvent[]) {
      events = nextEvents.map(snapshotHubEvent);
      notify();
    },
    clearHubEvents() {
      events = [];
      notify();
    },
    clearExpiredEvents(now = Date.now()) {
      events = getActiveHubEvents(events, now);
      notify();
    },
    subscribe(subscriber: (state: HubStoreState) => void) {
      subscribers.add(subscriber);
      deliver(subscriber, snapshot());
      return () => subscribers.delete(subscriber);
    },
  };
}
