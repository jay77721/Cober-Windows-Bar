import assert from "node:assert/strict";
import { mockHubEvents } from "../data/mockHubData";
import { loadDesktopStatusEvents } from "./desktopStatusInputRuntime";

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

await testFallsBackToMockWithoutInvoke();
await testLoadsFixtureEventsFromTauriInvoke();
await testFallsBackToMockWhenFixtureLoadFails();
