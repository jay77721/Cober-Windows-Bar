import { strict as assert } from "node:assert";
import { createHubEventBus } from "../state/hubState";
import type { HubMode } from "../types/hub";
import {
  createMockNotificationEvent,
  createMockAiTaskProvider,
  createMockDownloadProvider,
  createMockMusicProvider,
  createMockNotificationProvider,
} from "./mockProviders";
import { connectProviderToEventBus } from "./providerAdapter";
import type { HubProvider } from "./types";

const now = Date.UTC(2026, 5, 6, 11, 0, 0);

function test(name: string, run: () => void) {
  run();
  console.log(`ok ${name}`);
}

function collectModes(provider: HubProvider): HubMode[] {
  const bus = createHubEventBus();
  const modes: HubMode[] = [];
  const unsubscribe = bus.subscribe((state) => modes.push(state.mode));
  const connection = connectProviderToEventBus(provider, bus);

  provider.start();

  connection.disconnect();
  unsubscribe();

  return modes;
}

test("adapter publishes music provider events through the event bus", () => {
  const modes = collectModes(createMockMusicProvider({ now }));

  assert.deepEqual(modes, ["idle", "music"]);
});

test("adapter publishes AI task provider events through the event bus", () => {
  const modes = collectModes(createMockAiTaskProvider({ now }));

  assert.deepEqual(modes, ["idle", "aiProgress"]);
});

test("adapter publishes download provider events through the event bus", () => {
  const modes = collectModes(createMockDownloadProvider({ now }));

  assert.deepEqual(modes, ["idle", "download"]);
});

test("mock provider events use canonical top-level fields", () => {
  const bus = createHubEventBus();
  const provider = createMockMusicProvider({ now });
  const connection = connectProviderToEventBus(provider, bus);

  provider.start();
  const [event] = bus.getState(now).events;

  assert.equal(event?.id, "mock-music-music-1780743600000");
  assert.equal(event?.type, "music");
  assert.equal(event?.source, "music");
  assert.equal(event?.createdAt, now);
  assert.equal("title" in (event ?? {}), false);
  assert.equal("subtitle" in (event ?? {}), false);
  assert.equal(bus.getState(now).tasks[0]?.title, "Midnight City");

  connection.disconnect();
});

test("mock providers start with stopped lifecycle and healthy health", () => {
  const provider = createMockMusicProvider({ now });

  assert.deepEqual(provider.status(), {
    lifecycle: "Stopped",
    health: "Healthy",
  });
});

test("start sets provider publishing and emits events", () => {
  const provider = createMockMusicProvider({ now });
  const emissions: string[][] = [];
  const unsubscribe = provider.subscribe((events) =>
    emissions.push(events.map((event) => event.id)),
  );

  provider.start();

  assert.deepEqual(provider.status(), {
    lifecycle: "Publishing",
    health: "Healthy",
  });
  assert.deepEqual(emissions, [["mock-music-music-1780743600000"]]);

  unsubscribe();
});

test("duplicate start does not duplicate unintended emissions", () => {
  const provider = createMockMusicProvider({ now });
  const emissions: string[][] = [];
  const unsubscribe = provider.subscribe((events) =>
    emissions.push(events.map((event) => event.id)),
  );

  provider.start();
  provider.start();

  assert.deepEqual(provider.status(), {
    lifecycle: "Publishing",
    health: "Healthy",
  });
  assert.deepEqual(emissions, [["mock-music-music-1780743600000"]]);

  unsubscribe();
});

test("stop sets provider stopped lifecycle and keeps health healthy", () => {
  const provider = createMockMusicProvider({ now });

  provider.start();
  provider.stop();

  assert.deepEqual(provider.status(), {
    lifecycle: "Stopped",
    health: "Healthy",
  });
});

test("unsubscribe prevents provider listener calls", () => {
  const provider = createMockMusicProvider({ now });
  let calls = 0;
  const unsubscribe = provider.subscribe(() => {
    calls += 1;
  });

  unsubscribe();
  provider.start();

  assert.equal(calls, 0);
});

test("adapter preserves notification expiry behavior", () => {
  const bus = createHubEventBus();
  const provider = createMockNotificationProvider({ now });
  const connection = connectProviderToEventBus(provider, bus);
  const notification = createMockNotificationEvent({ now });

  provider.start();

  assert.equal(bus.getState(notification.expiresAt - 1).mode, "notification");
  assert.equal(bus.getState(notification.expiresAt).mode, "idle");

  connection.disconnect();
});

test("disconnect stops forwarding provider emissions", () => {
  const bus = createHubEventBus();
  const provider = createMockMusicProvider({ now });
  const connection = connectProviderToEventBus(provider, bus);

  connection.disconnect();
  provider.start();

  assert.equal(bus.getState(now).mode, "idle");
});

test("disconnect cleanup is safe to call more than once", () => {
  const bus = createHubEventBus();
  const provider = createMockMusicProvider({ now });
  const connection = connectProviderToEventBus(provider, bus);

  connection.disconnect();
  connection.disconnect();
  provider.start();

  assert.equal(bus.getState(now).mode, "idle");
});
