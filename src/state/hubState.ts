import type { HubEvent, HubMode, HubStoreState, HubTask } from "../types/hub";

const taskAccentMap = {
  music: "pink",
  ai: "blue",
  download: "green",
  notification: "cyan",
} as const;

const clampProgress = (value: number) => Math.max(0, Math.min(value, 100));

export function getActiveHubEvents(events: HubEvent[], now = Date.now()) {
  return events
    .filter((event) => event.expiresAt === undefined || event.expiresAt > now)
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

  return {
    id: event.id,
    type: event.type,
    title: payload?.title ?? event.type,
    subtitle: payload?.subtitle ?? "",
    progress: event.progress === undefined ? undefined : clampProgress(event.progress),
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
        ? { ...musicEvent.payload }
        : undefined,
  };
}

export type HubEventBus = {
  getState(now?: number): HubStoreState;
  publishHubEvent(event: HubEvent): void;
  clearHubEvents(): void;
  clearExpiredEvents(now?: number): void;
  subscribe(subscriber: (state: HubStoreState) => void): () => void;
};

export function createHubEventBus(initialEvents: HubEvent[] = []): HubEventBus {
  let events = [...initialEvents];
  const subscribers = new Set<(state: HubStoreState) => void>();

  function snapshot(now = Date.now()) {
    return createHubStoreState(events, now);
  }

  function notify() {
    const state = snapshot();
    subscribers.forEach((subscriber) => {
      try {
        subscriber(state);
      } catch {
        // Subscriber failures should not prevent unrelated listeners from receiving state.
      }
    });
  }

  return {
    getState: snapshot,
    publishHubEvent(event: HubEvent) {
      events = [event, ...events.filter((item) => item.id !== event.id)];
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
      subscriber(snapshot());
      return () => subscribers.delete(subscriber);
    },
  };
}
