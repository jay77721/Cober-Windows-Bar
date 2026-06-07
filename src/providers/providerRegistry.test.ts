import { strict as assert } from "node:assert";
import {
  createMockAIProvider,
  createMockDownloadProvider,
  createMockMusicProvider,
  createMockNotificationProvider,
} from "./mockProviders";
import { createProviderRegistry } from "./providerRegistry";
import type {
  HubProvider,
  HubProviderCapability,
  HubProviderLifecycle,
  HubProviderStatus,
} from "./types";

function test(name: string, run: () => void) {
  run();
  console.log(`ok ${name}`);
}

const musicCapabilityPreflightDescriptor: HubProviderCapability = {
  id: "music",
  kind: "music",
  origin: "native",
  support: "preflight",
};

function providerWithSpies(
  id = "spy-provider",
  initialLifecycle: HubProviderLifecycle = "Stopped",
  health: HubProviderStatus["health"] = "Healthy",
) {
  let lifecycle = initialLifecycle;
  let startCalls = 0;
  let stopCalls = 0;
  let subscribeCalls = 0;

  const provider: HubProvider = {
    id,
    label: "Spy Provider",
    metadata: {
      id,
      name: "Spy Provider",
      kind: "music",
      version: "0.6.0",
      mock: true,
    },
    capabilities: [{ id: "music", kind: "music", origin: "mock", support: "available" }],
    start() {
      startCalls += 1;
      lifecycle = "Publishing";
    },
    stop() {
      stopCalls += 1;
      lifecycle = "Stopped";
    },
    subscribe() {
      subscribeCalls += 1;
      throw new Error("registry must not subscribe to provider events");
    },
    status(): HubProviderStatus {
      return {
        lifecycle,
        health,
      };
    },
  };

  return {
    provider,
    get startCalls() {
      return startCalls;
    },
    get stopCalls() {
      return stopCalls;
    },
    get subscribeCalls() {
      return subscribeCalls;
    },
  };
}

test("registry registers, lists, and gets provider records", () => {
  const registry = createProviderRegistry();
  const music = createMockMusicProvider();
  const result = registry.register(music);

  assert.equal(result.ok, true);
  assert.equal(registry.get(music.id)?.id, music.id);
  assert.deepEqual(
    registry.list().map((record) => record.id),
    [music.id],
  );
  assert.deepEqual(registry.get(music.id)?.metadata, music.metadata);
  assert.deepEqual(registry.get(music.id)?.capabilities, music.capabilities);
  assert.deepEqual(registry.get(music.id)?.status, music.status());
});

test("registry rejects duplicate ids and leaves existing provider unchanged", () => {
  const registry = createProviderRegistry();
  const first = createMockMusicProvider();
  const duplicate = createMockMusicProvider();

  assert.equal(registry.register(first).ok, true);
  const duplicateResult = registry.register(duplicate);

  assert.deepEqual(duplicateResult, {
    ok: false,
    error: "duplicate-provider-id",
    id: first.id,
  });
  assert.equal(registry.list().length, 1);
  assert.equal(registry.get(first.id)?.metadata.name, first.metadata.name);
});

test("registry preserves deterministic registration order", () => {
  const registry = createProviderRegistry();
  const providers = [
    createMockMusicProvider(),
    createMockAIProvider(),
    createMockDownloadProvider(),
    createMockNotificationProvider(),
  ];

  providers.forEach((provider) => registry.register(provider));

  assert.deepEqual(
    registry.list().map((record) => [record.id, record.registrationOrder]),
    [
      ["mock-music-provider", 0],
      ["mock-ai-task-provider", 1],
      ["mock-download-provider", 2],
      ["mock-notification-provider", 3],
    ],
  );
});

test("registry list returns a copy instead of mutable internal array", () => {
  const registry = createProviderRegistry();
  registry.register(createMockMusicProvider());

  const firstList = registry.list();
  firstList.pop();

  assert.equal(firstList.length, 0);
  assert.equal(registry.list().length, 1);
});

test("registry unregister removes known providers and ignores unknown ids", () => {
  const registry = createProviderRegistry();
  const music = createMockMusicProvider();

  registry.register(music);

  assert.equal(registry.unregister("missing-provider"), false);
  assert.equal(registry.unregister(music.id), true);
  assert.equal(registry.get(music.id), undefined);
  assert.deepEqual(registry.list(), []);
});

test("registry unregister stops active providers before removal", () => {
  const registry = createProviderRegistry();
  const spy = providerWithSpies();

  registry.register(spy.provider);
  registry.start(spy.provider.id);

  assert.equal(spy.startCalls, 1);
  assert.equal(spy.stopCalls, 0);
  assert.equal(registry.unregister(spy.provider.id), true);
  assert.equal(spy.stopCalls, 1);
  assert.equal(registry.get(spy.provider.id), undefined);
});

test("registry unregister stop semantics follow provider lifecycle", () => {
  for (const lifecycle of ["Started", "Publishing", "Paused"] as const) {
    const registry = createProviderRegistry();
    const spy = providerWithSpies(`spy-${lifecycle}`, lifecycle);

    registry.register(spy.provider);

    assert.equal(registry.unregister(spy.provider.id), true);
    assert.equal(spy.stopCalls, 1);
    assert.equal(registry.get(spy.provider.id), undefined);
  }

  const registry = createProviderRegistry();
  const stopped = providerWithSpies("spy-stopped", "Stopped");

  registry.register(stopped.provider);

  assert.equal(registry.unregister(stopped.provider.id), true);
  assert.equal(stopped.stopCalls, 0);
});

test("registry start and stop delegate and refresh status snapshots", () => {
  const registry = createProviderRegistry();
  const spy = providerWithSpies();

  registry.register(spy.provider);

  assert.deepEqual(registry.get(spy.provider.id)?.status, {
    lifecycle: "Stopped",
    health: "Healthy",
  });
  assert.equal(registry.start(spy.provider.id)?.status.lifecycle, "Publishing");
  assert.equal(spy.startCalls, 1);
  assert.equal(registry.stop(spy.provider.id)?.status.lifecycle, "Stopped");
  assert.equal(spy.stopCalls, 1);
  assert.equal(registry.start("missing-provider"), undefined);
  assert.equal(registry.stop("missing-provider"), undefined);
});

test("registry snapshots keep lifecycle and health separate", () => {
  const registry = createProviderRegistry();
  const failed = providerWithSpies("spy-failed", "Failed", "Unhealthy");

  registry.register(failed.provider);

  assert.deepEqual(registry.get(failed.provider.id)?.status, {
    lifecycle: "Failed",
    health: "Unhealthy",
  });
  assert.deepEqual(registry.list()[0]?.status, {
    lifecycle: "Failed",
    health: "Unhealthy",
  });
});

test("registry snapshots do not expose mutable capability internals", () => {
  const registry = createProviderRegistry();
  const music = createMockMusicProvider();

  registry.register(music);

  const fromGet = registry.get(music.id);
  const fromList = registry.list()[0];

  fromGet?.capabilities.push({ id: "ai", kind: "ai", origin: "mock", support: "available" });
  fromList?.capabilities.pop();

  assert.deepEqual(registry.get(music.id)?.capabilities, [
    { id: "music", kind: "music", origin: "mock", support: "available" },
  ]);
  assert.deepEqual(registry.list()[0]?.capabilities, [
    { id: "music", kind: "music", origin: "mock", support: "available" },
  ]);
});

test("registry snapshots preserve native preflight capability facts without provider behavior changes", () => {
  const registry = createProviderRegistry();
  const nativePreflight = providerWithSpies("native-music-preflight");

  nativePreflight.provider.metadata = {
    ...nativePreflight.provider.metadata,
    mock: false,
  };
  nativePreflight.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ];

  registry.register(nativePreflight.provider);

  const fromGet = registry.get(nativePreflight.provider.id);
  const fromList = registry.list()[0];

  assert.deepEqual(fromGet?.capabilities, [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ]);
  assert.deepEqual(fromList?.capabilities, fromGet?.capabilities);

  fromGet?.capabilities.pop();
  fromList?.capabilities.push({
    id: "music",
    kind: "music",
    origin: "native",
    support: "unsupported",
  });

  assert.deepEqual(registry.get(nativePreflight.provider.id)?.capabilities, [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ]);
  assert.equal(nativePreflight.startCalls, 0);
  assert.equal(nativePreflight.subscribeCalls, 0);
});

test("registry does not subscribe, emit events, or expose priority and mode fields", () => {
  const registry = createProviderRegistry();
  const spy = providerWithSpies();

  registry.register(spy.provider);
  registry.start(spy.provider.id);
  const record = registry.get(spy.provider.id);

  assert.equal(spy.subscribeCalls, 0);
  assert.equal("provider" in (record ?? {}), false);
  assert.equal("eventBus" in (record ?? {}), false);
  assert.equal("store" in (record ?? {}), false);
  assert.equal("resolver" in (record ?? {}), false);
  assert.equal("priority" in (record ?? {}), false);
  assert.equal("rank" in (record ?? {}), false);
  assert.equal("mode" in (record ?? {}), false);
  assert.equal("finalHubMode" in (record ?? {}), false);
});
