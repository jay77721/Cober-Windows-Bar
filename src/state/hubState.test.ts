import { strict as assert } from "node:assert";
import type { HubEvent } from "../types/hub";
import {
  createAutoDemoSequence,
  createHubDemoScenario,
  createHubDemoScenarios,
  playHubDemoScenario,
} from "./hubScenarios";
import { createHubEventBus, createHubStoreState, getActiveHubEvents, resolveHubMode } from "./hubState";

const now = Date.UTC(2026, 5, 6, 8, 20, 0);

function event(overrides: Partial<HubEvent> = {}): HubEvent {
  return {
    id: "event-1",
    type: "ai",
    source: "mock",
    createdAt: now,
    progress: 68,
    payload: {
      id: "event-1-task",
      type: "ai",
      title: "GPT-5.5",
      subtitle: "正在生成代码...",
      progress: 68,
      accent: "blue",
    },
    ...overrides,
  };
}

function test(name: string, run: () => void) {
  run();
  console.log(`✓ ${name}`);
}

test("resolves idle when there are no active events", () => {
  assert.equal(resolveHubMode([], now), "idle");
});

test("resolves a single active task to its matching hub mode", () => {
  assert.equal(resolveHubMode([event({ type: "music" })], now), "music");
  assert.equal(resolveHubMode([event({ type: "ai" })], now), "aiProgress");
  assert.equal(resolveHubMode([event({ type: "download" })], now), "download");
});

test("notification takes priority while it is active", () => {
  assert.equal(
    resolveHubMode(
      [
        event({ id: "ai", type: "ai" }),
        event({ id: "notification", type: "notification", expiresAt: now + 3000 }),
      ],
      now,
    ),
    "notification",
  );
});

test("multiple active tasks resolve to multiTask", () => {
  assert.equal(
    resolveHubMode(
      [
        event({ id: "ai", type: "ai" }),
        event({ id: "download", type: "download" }),
      ],
      now,
    ),
    "multiTask",
  );
});

test("expired events are ignored and cleaned from state", () => {
  const events = [
    event({ id: "expired", type: "notification", expiresAt: now - 1 }),
    event({ id: "download", type: "download", createdAt: now - 2000 }),
  ];

  assert.deepEqual(
    getActiveHubEvents(events, now).map((item) => item.id),
    ["download"],
  );
  assert.equal(createHubStoreState(events, now).mode, "download");
});

test("event bus publishes latest state and replaces events by id", () => {
  const bus = createHubEventBus();
  const states: string[] = [];
  const unsubscribe = bus.subscribe((state) => states.push(state.mode));

  bus.publishHubEvent(event({ id: "task", type: "ai", progress: 10 }));
  bus.publishHubEvent(event({ id: "task", type: "ai", progress: 80, createdAt: now + 1000 }));

  assert.deepEqual(states, ["idle", "aiProgress", "aiProgress"]);
  assert.equal(bus.getState(now + 1000).events.length, 1);
  assert.equal(bus.getState(now + 1000).tasks[0]?.progress, 80);

  unsubscribe();
});

test("event bus cleanup removes expired events and notifies subscribers", () => {
  const bus = createHubEventBus([
    event({ id: "expired", type: "notification", expiresAt: now - 1 }),
    event({ id: "download", type: "download", createdAt: now - 2000 }),
  ]);
  const observedEventIds: string[][] = [];
  const unsubscribe = bus.subscribe((state) =>
    observedEventIds.push(state.events.map((item) => item.id)),
  );

  assert.deepEqual(
    bus.getState(now - 2).events.map((item) => item.id),
    ["expired", "download"],
  );

  bus.clearExpiredEvents(now);

  assert.deepEqual(
    bus.getState(now - 2).events.map((item) => item.id),
    ["download"],
  );
  assert.deepEqual(
    bus.getState(now).events.map((item) => item.id),
    ["download"],
  );
  assert.deepEqual(observedEventIds, [["download"], ["download"]]);

  unsubscribe();
});

test("event bus subscriber errors do not block later state delivery", () => {
  const bus = createHubEventBus([
    event({ id: "expired", type: "notification", expiresAt: now - 1 }),
    event({ id: "download", type: "download", createdAt: now - 2000 }),
  ]);
  const observedModes: string[] = [];
  const observedEventIds: string[][] = [];
  let throwingSubscriberCalls = 0;
  const unsubscribeThrowing = bus.subscribe((state) => {
    throwingSubscriberCalls += 1;
    observedModes.push(state.mode);

    if (throwingSubscriberCalls > 1) {
      throw new Error("subscriber failed");
    }
  });
  const unsubscribeLater = bus.subscribe((state) => {
    observedEventIds.push(state.events.map((item) => item.id));
  });

  assert.doesNotThrow(() => bus.publishHubEvent(event({ id: "ai", type: "ai" })));
  assert.doesNotThrow(() => bus.clearExpiredEvents(now));

  assert.deepEqual(observedModes, ["download", "multiTask", "multiTask"]);
  assert.deepEqual(observedEventIds, [
    ["download"],
    ["ai", "download"],
    ["ai", "download"],
  ]);

  unsubscribeThrowing();
  unsubscribeLater();
});

test("store derives task display fields from event payload", () => {
  const state = createHubStoreState([event()], now);

  assert.equal(state.tasks[0]?.title, "GPT-5.5");
  assert.equal(state.tasks[0]?.subtitle, "正在生成代码...");
});

test("store clamps task progress into the canonical display range", () => {
  const highProgressState = createHubStoreState([event({ id: "high", progress: 150 })], now);
  const lowProgressState = createHubStoreState([event({ id: "low", progress: -20 })], now);

  assert.equal(highProgressState.tasks[0]?.progress, 100);
  assert.equal(lowProgressState.tasks[0]?.progress, 0);
});

test("store normalizes non-finite task progress to zero", () => {
  const nanProgressState = createHubStoreState([event({ id: "nan", progress: Number.NaN })], now);
  const infinityProgressState = createHubStoreState(
    [event({ id: "infinity", progress: Number.POSITIVE_INFINITY })],
    now,
  );

  assert.equal(nanProgressState.tasks[0]?.progress, 0);
  assert.equal(infinityProgressState.tasks[0]?.progress, 0);
});

test("store defaults task progress to zero for progress-rendering modes", () => {
  const aiState = createHubStoreState([event({ id: "ai", type: "ai", progress: undefined })], now);
  const downloadState = createHubStoreState(
    [event({ id: "download", type: "download", progress: undefined })],
    now,
  );

  assert.equal(aiState.tasks[0]?.progress, 0);
  assert.equal(downloadState.tasks[0]?.progress, 0);
});

test("store notification snapshots do not expose mutable event payloads", () => {
  const notificationPayload = {
    app: "Cober",
    sender: "Mock Provider",
    message: "Original message",
  };
  const state = createHubStoreState(
    [event({ id: "notification", type: "notification", payload: notificationPayload })],
    now,
  );

  if (!state.notification) {
    throw new Error("expected notification snapshot");
  }

  state.notification.message = "Mutated outside store";

  assert.equal(notificationPayload.message, "Original message");
});

test("store music snapshots do not expose mutable event payloads", () => {
  const musicPayload = {
    title: "Original track",
    subtitle: "Original artist",
    time: "1:00 / 3:00",
    progress: 33,
  };
  const state = createHubStoreState(
    [event({ id: "music", type: "music", payload: musicPayload })],
    now,
  );

  if (!state.music) {
    throw new Error("expected music snapshot");
  }

  state.music.title = "Mutated outside store";

  assert.equal(musicPayload.title, "Original track");
});

test("store clamps music progress into the canonical display range", () => {
  const highProgressState = createHubStoreState(
    [
      event({
        id: "music-high",
        type: "music",
        payload: { title: "Track", subtitle: "Artist", time: "1:00 / 3:00", progress: 150 },
      }),
    ],
    now,
  );
  const lowProgressState = createHubStoreState(
    [
      event({
        id: "music-low",
        type: "music",
        payload: { title: "Track", subtitle: "Artist", time: "1:00 / 3:00", progress: -20 },
      }),
    ],
    now,
  );

  assert.equal(highProgressState.music?.progress, 100);
  assert.equal(lowProgressState.music?.progress, 0);
});

test("store normalizes non-finite music progress to zero", () => {
  const nanProgressState = createHubStoreState(
    [
      event({
        id: "music-nan",
        type: "music",
        payload: { title: "Track", subtitle: "Artist", time: "1:00 / 3:00", progress: Number.NaN },
      }),
    ],
    now,
  );
  const infinityProgressState = createHubStoreState(
    [
      event({
        id: "music-infinity",
        type: "music",
        payload: {
          title: "Track",
          subtitle: "Artist",
          time: "1:00 / 3:00",
          progress: Number.POSITIVE_INFINITY,
        },
      }),
    ],
    now,
  );

  assert.equal(nanProgressState.music?.progress, 0);
  assert.equal(infinityProgressState.music?.progress, 0);
});

test("store event snapshots do not expose mutable event payload references", () => {
  const taskPayload = {
    id: "task",
    type: "ai" as const,
    title: "Original task",
    subtitle: "Original subtitle",
    progress: 42,
    accent: "blue" as const,
  };
  const state = createHubStoreState([event({ id: "ai", type: "ai", payload: taskPayload })], now);
  const snapshotPayload = state.events[0]?.payload;

  if (!snapshotPayload || !("title" in snapshotPayload)) {
    throw new Error("expected task payload snapshot");
  }

  snapshotPayload.title = "Mutated outside store";

  assert.equal(taskPayload.title, "Original task");
});

test("event demo scenarios resolve to their expected hub modes", () => {
  for (const scenario of createHubDemoScenarios(now)) {
    assert.equal(resolveHubMode(scenario.events, now), scenario.expectedMode);
  }
});

test("event demo notification expires back to idle", () => {
  const scenario = createHubDemoScenario("notification", now);

  assert.equal(resolveHubMode(scenario.events, now), "notification");
  assert.equal(resolveHubMode(scenario.events, now + 4000), "idle");
});

test("event demo can clear the event bus back to idle", () => {
  const bus = createHubEventBus();

  playHubDemoScenario(bus, createHubDemoScenario("download", now), now);
  assert.equal(bus.getState(now).mode, "download");

  const state = playHubDemoScenario(bus, createHubDemoScenario("idle", now), now);
  assert.equal(state.mode, "idle");
  assert.equal(state.events.length, 0);
});

test("event demo auto sequence follows the v0.2 playback order", () => {
  const sequence = createAutoDemoSequence(now);

  assert.deepEqual(
    sequence.map((step) => step.id),
    ["idle", "music", "ai", "notification", "download", "multiTask", "idle"],
  );
  assert.deepEqual(
    sequence.map((step) => step.expectedMode),
    ["idle", "music", "aiProgress", "notification", "download", "multiTask", "idle"],
  );
});
