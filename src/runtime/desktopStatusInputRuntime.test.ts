import assert from "node:assert/strict";
import { mockHubEvents } from "../data/mockHubData";
import { createHubEventBus, getActiveHubEvents } from "../state/hubState";
import {
  createDesktopStatusRuntime,
  createTauriDesktopStatusEventSource,
  DESKTOP_STATUS_INPUT_EVENT,
  loadDesktopStatusEvents,
} from "./desktopStatusInputRuntime";

const fixtureEvents = [
  {
    id: "fixture-download",
    type: "download" as const,
    source: "download" as const,
    createdAt: 123,
    progress: 52,
    payload: {
      id: "fixture-download",
      type: "download" as const,
      title: "fixture.bin",
      subtitle: "52 / 100",
      progress: 52,
      accent: "green" as const,
    },
  },
];

async function testFallsBackToMockWithoutInvoke() {
  const result = await loadDesktopStatusEvents();

  assert.equal(result.source, "mock");
  assert.deepEqual(
    result.events.map(({ metadata: _metadata, ...event }) => event),
    mockHubEvents,
  );
  assert.notEqual(result.events, mockHubEvents);
}

async function testLoadsFixtureEventsFromTauriInvoke() {
  const result = await loadDesktopStatusEvents({
    invoke: async (command) => {
      assert.equal(command, "get_hub_event_fixtures");
      return fixtureEvents;
    },
  });

  assert.equal(result.source, "tauri-fixture");
  assert.deepEqual(
    result.events.map(({ metadata: _metadata, ...event }) => event),
    fixtureEvents,
  );
  assert.notEqual(result.events, fixtureEvents);
}

async function testSkipsFixtureLoadWhenDisabled() {
  let invokeCalls = 0;
  const result = await loadDesktopStatusEvents({
    fallbackEvents: [],
    loadFixtureEvents: false,
    invoke: async () => {
      invokeCalls += 1;
      return fixtureEvents;
    },
  });

  assert.equal(invokeCalls, 0);
  assert.equal(result.source, "mock");
  assert.deepEqual(result.events, []);
}

async function testFallsBackToMockWhenFixtureLoadFails() {
  const result = await loadDesktopStatusEvents({
    invoke: async () => {
      throw new Error("invoke failed");
    },
  });

  assert.equal(result.source, "mock");
  assert.deepEqual(
    result.events.map(({ metadata: _metadata, ...event }) => event),
    mockHubEvents,
  );
  assert.equal(result.diagnostic?.code, "invoke-failed");
}

async function testDesktopStatusRuntimeCanStartFromResidentProductInput() {
  let invokeCalls = 0;
  const runtime = createDesktopStatusRuntime({
    fallbackEvents: [],
    loadFixtureEvents: false,
    invoke: async () => {
      invokeCalls += 1;
      return fixtureEvents;
    },
  });

  const initialSnapshot = runtime.getSnapshot();
  assert.equal(initialSnapshot.source, "mock");
  assert.equal(initialSnapshot.sourceStatus.activeSource, "mock");
  assert.equal(initialSnapshot.sourceStatus.quality, "fallback");
  assert.deepEqual(initialSnapshot.state.events, []);

  const refreshedSnapshot = await runtime.refresh();
  assert.equal(invokeCalls, 0);
  assert.equal(refreshedSnapshot.source, "mock");
  assert.equal(refreshedSnapshot.sourceStatus.activeSource, "mock");
  assert.equal(refreshedSnapshot.sourceStatus.quality, "fallback");
  assert.deepEqual(refreshedSnapshot.state.events, []);

  runtime.dispose();
}

async function testDesktopStatusRuntimeSeedsBusAndRefreshesFromFixtureSource() {
  const runtime = createDesktopStatusRuntime({
    invoke: async () => fixtureEvents,
  });

  const initialSnapshot = runtime.getSnapshot();
  assert.equal(initialSnapshot.source, "mock");
  assert.equal(initialSnapshot.sourceStatus.activeSource, "mock");
  assert.equal(initialSnapshot.sourceStatus.quality, "fallback");
  assert.deepEqual(
    initialSnapshot.state.events.map((event) => event.id),
    getActiveHubEvents(mockHubEvents).map((event) => event.id),
  );

  const refreshedSnapshot = await runtime.refresh();
  assert.equal(refreshedSnapshot.source, "tauri-fixture");
  assert.equal(refreshedSnapshot.sourceStatus.activeSource, "tauri-fixture");
  assert.equal(refreshedSnapshot.sourceStatus.lastSuccessfulSource, "tauri-fixture");
  assert.equal(refreshedSnapshot.sourceStatus.quality, "live");
  assert.deepEqual(
    refreshedSnapshot.state.events.map((event) => event.id),
    ["fixture-download"],
  );

  runtime.dispose();
}

async function testDesktopStatusRuntimeSubscribersReceiveBusUpdates() {
  const bus = createHubEventBus();
  const runtime = createDesktopStatusRuntime({
    eventBus: bus,
    fallbackEvents: fixtureEvents,
  });
  const observedEventIds: string[][] = [];
  const unsubscribe = runtime.subscribe((snapshot) => {
    observedEventIds.push(snapshot.state.events.map((event) => event.id));
  });

  bus.publishHubEvent({
    id: "live-ai",
    type: "ai",
    source: "ai",
    createdAt: 456,
    progress: 61,
    payload: {
      id: "live-ai-task",
      type: "ai",
      title: "Live stream",
      subtitle: "From bus",
      progress: 61,
      accent: "blue",
    },
  });

  assert.deepEqual(observedEventIds[0], ["fixture-download"]);
  assert.deepEqual(observedEventIds[observedEventIds.length - 1], ["live-ai", "fixture-download"]);

  unsubscribe();
  runtime.dispose();
}

async function testDesktopStatusRuntimeAcceptsPushListenerUpdates() {
  let emit: ((events: typeof fixtureEvents, source?: "mock" | "tauri-fixture") => void) | undefined;
  const runtime = createDesktopStatusRuntime({
    fallbackEvents: fixtureEvents,
    subscribeToEvents(listener) {
      emit = (events, source) => listener(events, source);
      return () => {
        emit = undefined;
      };
    },
  });
  const observedEventIds: string[][] = [];
  const observedSources: string[] = [];
  const unsubscribe = runtime.subscribe((snapshot) => {
    observedEventIds.push(snapshot.state.events.map((event) => event.id));
    observedSources.push(snapshot.source);
  });

  emit?.(
    [
      {
        id: "push-download",
        type: "download",
        source: "download",
        createdAt: 789,
        progress: 87,
        payload: {
          id: "push-download",
          type: "download",
          title: "push.bin",
          subtitle: "87 / 100",
          progress: 87,
          accent: "green",
        },
      },
    ],
    "tauri-fixture",
  );

  assert.deepEqual(observedEventIds[0], ["fixture-download"]);
  assert.deepEqual(observedEventIds[observedEventIds.length - 1], ["push-download"]);
  assert.equal(observedSources[observedSources.length - 1], "tauri-fixture");

  unsubscribe();
  runtime.dispose();
}

async function testDesktopStatusRuntimeMarksFallbackAsStaleAfterSuccessfulNativeRefresh() {
  let invokeCalls = 0;
  const runtime = createDesktopStatusRuntime({
    invoke: async () => {
      invokeCalls += 1;
      if (invokeCalls === 1) {
        return fixtureEvents;
      }

      throw new Error("fixture bridge failed");
    },
  });

  const liveSnapshot = await runtime.refresh();
  assert.equal(liveSnapshot.sourceStatus.quality, "live");
  assert.equal(liveSnapshot.sourceStatus.lastSuccessfulSource, "tauri-fixture");

  const fallbackSnapshot = await runtime.refresh();
  assert.equal(fallbackSnapshot.source, "mock");
  assert.equal(fallbackSnapshot.sourceStatus.activeSource, "mock");
  assert.equal(fallbackSnapshot.sourceStatus.lastSuccessfulSource, "tauri-fixture");
  assert.equal(fallbackSnapshot.sourceStatus.quality, "stale");
  assert.equal(fallbackSnapshot.sourceStatus.fallbackReason, "invoke-failed");

  runtime.dispose();
}

async function testDesktopStatusRuntimeDisposeUnsubscribesPushListener() {
  let unsubscribeCalls = 0;
  let emit: ((events: typeof fixtureEvents) => void) | undefined;
  const runtime = createDesktopStatusRuntime({
    fallbackEvents: fixtureEvents,
    subscribeToEvents(listener) {
      emit = (events) => listener(events);
      return () => {
        unsubscribeCalls += 1;
        emit = undefined;
      };
    },
  });
  const observedEventIds: string[][] = [];
  runtime.subscribe((snapshot) => {
    observedEventIds.push(snapshot.state.events.map((event) => event.id));
  });

  runtime.dispose();
  emit?.([
    {
      id: "late-download",
      type: "download",
      source: "download",
      createdAt: 999,
      progress: 10,
      payload: {
        id: "late-download",
        type: "download",
        title: "late.bin",
        subtitle: "10 / 100",
        progress: 10,
        accent: "green",
      },
    },
  ]);

  assert.equal(unsubscribeCalls, 1);
  assert.deepEqual(observedEventIds, [["fixture-download"]]);
}

async function testTauriDesktopStatusEventSourceEmitsCanonicalEvents() {
  let registeredEventName: string | undefined;
  let handler:
    | ((event: { payload: unknown }) => void | Promise<void>)
    | undefined;
  const source = createTauriDesktopStatusEventSource({
    tauriListen: async (eventName, nextHandler) => {
      registeredEventName = eventName;
      handler = nextHandler as typeof handler;
      return () => {
        handler = undefined;
      };
    },
  });
  const observed: Array<{ ids: string[]; source?: string }> = [];
  const unsubscribe = await source((events, sourceName) => {
    observed.push({
      ids: events.map((event) => event.id),
      source: sourceName,
    });
  });

  await handler?.({ payload: { events: fixtureEvents } });

  assert.equal(registeredEventName, DESKTOP_STATUS_INPUT_EVENT);
  assert.deepEqual(observed, [
    {
      ids: ["fixture-download"],
      source: "tauri-event",
    },
  ]);

  unsubscribe();
}

async function testDesktopStatusRuntimeUsesTauriEventSourceAndUnlistensOnDispose() {
  let handler:
    | ((event: { payload: unknown }) => void | Promise<void>)
    | undefined;
  let unlistenCalls = 0;
  const runtime = createDesktopStatusRuntime({
    invoke: async () => fixtureEvents,
    fallbackEvents: mockHubEvents,
    tauriListen: async (eventName, nextHandler) => {
      assert.equal(eventName, DESKTOP_STATUS_INPUT_EVENT);
      handler = nextHandler as typeof handler;
      return () => {
        unlistenCalls += 1;
        handler = undefined;
      };
    },
  });
  const observedEventIds: string[][] = [];
  const observedSources: string[] = [];
  runtime.subscribe((snapshot) => {
    observedEventIds.push(snapshot.state.events.map((event) => event.id));
    observedSources.push(snapshot.source);
  });

  await handler?.({ payload: fixtureEvents });

  assert.deepEqual(observedEventIds[0], getActiveHubEvents(mockHubEvents).map((event) => event.id));
  assert.deepEqual(observedEventIds[observedEventIds.length - 1], ["fixture-download"]);
  assert.equal(observedSources[observedSources.length - 1], "tauri-event");
  const liveSnapshot = runtime.getSnapshot();
  assert.equal(liveSnapshot.sourceStatus.activeSource, "tauri-event");
  assert.equal(liveSnapshot.sourceStatus.lastSuccessfulSource, "tauri-event");
  assert.equal(liveSnapshot.sourceStatus.quality, "live");

  runtime.dispose();
  await Promise.resolve();
  assert.equal(unlistenCalls, 1);

  await handler?.({
    payload: [
      {
        ...fixtureEvents[0],
        id: "after-dispose",
        payload: {
          ...fixtureEvents[0].payload,
          id: "after-dispose",
        },
      },
    ],
  });
  assert.deepEqual(observedEventIds[observedEventIds.length - 1], ["fixture-download"]);
}

await testFallsBackToMockWithoutInvoke();
await testLoadsFixtureEventsFromTauriInvoke();
await testSkipsFixtureLoadWhenDisabled();
await testFallsBackToMockWhenFixtureLoadFails();
await testDesktopStatusRuntimeCanStartFromResidentProductInput();
await testDesktopStatusRuntimeSeedsBusAndRefreshesFromFixtureSource();
await testDesktopStatusRuntimeSubscribersReceiveBusUpdates();
await testDesktopStatusRuntimeAcceptsPushListenerUpdates();
await testDesktopStatusRuntimeMarksFallbackAsStaleAfterSuccessfulNativeRefresh();
await testDesktopStatusRuntimeDisposeUnsubscribesPushListener();
await testTauriDesktopStatusEventSourceEmitsCanonicalEvents();
await testDesktopStatusRuntimeUsesTauriEventSourceAndUnlistensOnDispose();
