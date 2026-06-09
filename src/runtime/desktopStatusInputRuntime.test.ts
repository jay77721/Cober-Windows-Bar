import assert from "node:assert/strict";
import { mockHubEvents } from "../data/mockHubData";
import { createHubEventBus, getActiveHubEvents } from "../state/hubState";
import {
  createDesktopStatusRuntime,
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

async function testDesktopStatusRuntimeSeedsBusAndRefreshesFromFixtureSource() {
  const runtime = createDesktopStatusRuntime({
    invoke: async () => fixtureEvents,
  });

  const initialSnapshot = runtime.getSnapshot();
  assert.equal(initialSnapshot.source, "mock");
  assert.deepEqual(
    initialSnapshot.state.events.map((event) => event.id),
    getActiveHubEvents(mockHubEvents).map((event) => event.id),
  );

  const refreshedSnapshot = await runtime.refresh();
  assert.equal(refreshedSnapshot.source, "tauri-fixture");
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

await testFallsBackToMockWithoutInvoke();
await testLoadsFixtureEventsFromTauriInvoke();
await testFallsBackToMockWhenFixtureLoadFails();
await testDesktopStatusRuntimeSeedsBusAndRefreshesFromFixtureSource();
await testDesktopStatusRuntimeSubscribersReceiveBusUpdates();
