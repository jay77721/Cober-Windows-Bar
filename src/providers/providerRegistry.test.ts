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

test("registry lists provider capability support as copied read model facts", () => {
  const registry = createProviderRegistry();
  const music = createMockMusicProvider();
  const ai = createMockAIProvider();

  registry.register(music);
  registry.register(ai);

  const capabilitySupport = registry.listCapabilitySupport();

  assert.deepEqual(capabilitySupport, [
    {
      providerId: "mock-music-provider",
      providerName: "Mock Music Provider",
      providerKind: "music",
      registrationOrder: 0,
      capability: {
        id: "music",
        kind: "music",
        origin: "mock",
        support: "available",
      },
    },
    {
      providerId: "mock-ai-task-provider",
      providerName: "Mock AI Provider",
      providerKind: "ai",
      registrationOrder: 1,
      capability: {
        id: "ai",
        kind: "ai",
        origin: "mock",
        support: "available",
      },
    },
  ]);

  capabilitySupport[0]!.capability.support = "unsupported";

  assert.deepEqual(registry.listCapabilitySupport()[0]?.capability, {
    id: "music",
    kind: "music",
    origin: "mock",
    support: "available",
  });
});

test("registry capability support preserves native preflight facts without provider behavior", () => {
  const registry = createProviderRegistry();
  const nativePreflight = providerWithSpies("native-music-preflight");

  nativePreflight.provider.metadata = {
    ...nativePreflight.provider.metadata,
    name: "Native Music Capability Preflight",
    mock: false,
  };
  nativePreflight.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ];

  registry.register(nativePreflight.provider);

  assert.deepEqual(registry.listCapabilitySupport(), [
    {
      providerId: "native-music-preflight",
      providerName: "Native Music Capability Preflight",
      providerKind: "music",
      registrationOrder: 0,
      capability: {
        ...musicCapabilityPreflightDescriptor,
      },
    },
  ]);
  assert.equal(nativePreflight.startCalls, 0);
  assert.equal(nativePreflight.stopCalls, 0);
  assert.equal(nativePreflight.subscribeCalls, 0);
});

test("registry summarizes capability support as diagnostic aggregate facts", () => {
  const registry = createProviderRegistry();
  const nativePreflight = providerWithSpies("native-music-preflight");

  nativePreflight.provider.metadata = {
    ...nativePreflight.provider.metadata,
    name: "Native Music Capability Preflight",
    mock: false,
  };
  nativePreflight.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ];

  registry.register(createMockMusicProvider());
  registry.register(createMockAIProvider());
  registry.register(nativePreflight.provider);

  const summary = registry.summarizeCapabilitySupport();

  assert.deepEqual(summary, [
    {
      kind: "music",
      origin: "mock",
      support: "available",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["mock-music-provider"],
    },
    {
      kind: "ai",
      origin: "mock",
      support: "available",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["mock-ai-task-provider"],
    },
    {
      kind: "music",
      origin: "native",
      support: "preflight",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["native-music-preflight"],
    },
  ]);
  assert.equal(nativePreflight.startCalls, 0);
  assert.equal(nativePreflight.stopCalls, 0);
  assert.equal(nativePreflight.subscribeCalls, 0);
});

test("registry capability support summary is empty for an empty registry", () => {
  const registry = createProviderRegistry();

  assert.deepEqual(registry.summarizeCapabilitySupport(), []);
});

test("registry capability support summary preserves first-seen bucket order", () => {
  const registry = createProviderRegistry();
  const first = providerWithSpies("first-diagnostic-provider");
  const second = providerWithSpies("second-diagnostic-provider");

  first.provider.metadata = {
    ...first.provider.metadata,
    name: "First Diagnostic Provider",
    mock: false,
  };
  first.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
    {
      id: "download",
      kind: "download",
      origin: "mock",
      support: "available",
    },
  ];
  second.provider.metadata = {
    ...second.provider.metadata,
    name: "Second Diagnostic Provider",
    kind: "ai",
  };
  second.provider.capabilities = [
    {
      id: "ai",
      kind: "ai",
      origin: "mock",
      support: "available",
    },
    {
      id: "music",
      kind: "music",
      origin: "mock",
      support: "available",
    },
  ];

  registry.register(first.provider);
  registry.register(second.provider);

  assert.deepEqual(
    registry
      .summarizeCapabilitySupport()
      .map((item) => [item.kind, item.origin, item.support]),
    [
      ["music", "native", "preflight"],
      ["download", "mock", "available"],
      ["ai", "mock", "available"],
      ["music", "mock", "available"],
    ],
  );
});

test("registry capability support summary aggregates repeated buckets across providers and capabilities", () => {
  const registry = createProviderRegistry();
  const first = providerWithSpies("first-native-music-preflight");
  const second = providerWithSpies("second-native-music-preflight");

  first.provider.metadata = {
    ...first.provider.metadata,
    mock: false,
  };
  first.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
    {
      ...musicCapabilityPreflightDescriptor,
      id: "music-secondary",
    },
  ];
  second.provider.metadata = {
    ...second.provider.metadata,
    mock: false,
  };
  second.provider.capabilities = [
    {
      ...musicCapabilityPreflightDescriptor,
    },
  ];

  registry.register(first.provider);
  registry.register(second.provider);

  assert.deepEqual(registry.summarizeCapabilitySupport(), [
    {
      kind: "music",
      origin: "native",
      support: "preflight",
      capabilityCount: 3,
      providerCount: 2,
      providerIds: ["first-native-music-preflight", "second-native-music-preflight"],
    },
  ]);
  assert.equal(first.startCalls, 0);
  assert.equal(first.stopCalls, 0);
  assert.equal(first.subscribeCalls, 0);
  assert.equal(second.startCalls, 0);
  assert.equal(second.stopCalls, 0);
  assert.equal(second.subscribeCalls, 0);
});

test("registry capability support summary provider ids are copied on every call", () => {
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

  const firstSummary = registry.summarizeCapabilitySupport();
  const secondSummary = registry.summarizeCapabilitySupport();

  assert.notEqual(firstSummary, secondSummary);
  assert.notEqual(firstSummary[0], secondSummary[0]);
  assert.notEqual(firstSummary[0]?.providerIds, secondSummary[0]?.providerIds);

  firstSummary[0]?.providerIds.push("caller-mutated-provider");

  assert.deepEqual(secondSummary, [
    {
      kind: "music",
      origin: "native",
      support: "preflight",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["native-music-preflight"],
    },
  ]);
  assert.deepEqual(registry.summarizeCapabilitySupport(), secondSummary);
});

test("registry capability support summary is copied and excludes lifecycle claims", () => {
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
    {
      id: "music",
      kind: "music",
      origin: "native",
      support: "unsupported",
    },
  ];

  registry.register(nativePreflight.provider);

  const summary = registry.summarizeCapabilitySupport();

  summary[0]?.providerIds.push("mutated-provider");

  assert.deepEqual(registry.summarizeCapabilitySupport(), [
    {
      kind: "music",
      origin: "native",
      support: "preflight",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["native-music-preflight"],
    },
    {
      kind: "music",
      origin: "native",
      support: "unsupported",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["native-music-preflight"],
    },
  ]);

  for (const item of summary) {
    assert.equal("status" in item, false);
    assert.equal("lifecycle" in item, false);
    assert.equal("health" in item, false);
    assert.equal("available" in item, false);
    assert.equal("ready" in item, false);
    assert.equal("connected" in item, false);
    assert.equal("implemented" in item, false);
  }
  assert.equal(nativePreflight.startCalls, 0);
  assert.equal(nativePreflight.stopCalls, 0);
  assert.equal(nativePreflight.subscribeCalls, 0);
});

test("registry diagnostic summary coexists with runtime Windows provider facts", () => {
  const registry = createProviderRegistry();
  const nativePreflight = providerWithSpies("native-music-preflight");
  const runtimeDiagnosticFacts = {
    windowsProviders: false,
  };

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

  const summary = registry.summarizeCapabilitySupport();

  assert.equal(runtimeDiagnosticFacts.windowsProviders, false);
  assert.deepEqual(summary, [
    {
      kind: "music",
      origin: "native",
      support: "preflight",
      capabilityCount: 1,
      providerCount: 1,
      providerIds: ["native-music-preflight"],
    },
  ]);
  assert.equal(
    summary.some((item) => item.origin === "native" && item.support === "available"),
    false,
  );
  for (const item of summary) {
    assert.equal("ready" in item, false);
    assert.equal("connected" in item, false);
    assert.equal("implemented" in item, false);
    assert.equal("active" in item, false);
  }
  assert.equal(nativePreflight.startCalls, 0);
  assert.equal(nativePreflight.stopCalls, 0);
  assert.equal(nativePreflight.subscribeCalls, 0);
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
