import { strict as assert } from "node:assert";
import {
  getTauriInvoke,
  loadTauriRuntimeCapabilities,
  loadTauriFixtureHubEvents,
  publishTauriFixtureEvents,
  TAURI_FIXTURE_COMMAND,
  TAURI_RUNTIME_CAPABILITIES_COMMAND,
  type TauriRuntimeDiagnostic,
  type TauriInvoke,
} from "./tauriRuntime";
import type { HubEvent } from "../types/hub";
import type { HubProviderCapability } from "../providers/types";

const tests: Array<{ name: string; run: () => void | Promise<void> }> = [];

const canonicalRuntimeCapabilities = {
  runtime: "tauri",
  fixtureIpc: true,
  tray: false,
  alwaysOnTop: false,
  windowsProviders: false,
  configuredShellWindow: {
    configured: true,
    title: "Cober Windows Bar",
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    resizable: true,
    centered: true,
  },
} as const;

function test(name: string, run: () => void | Promise<void>) {
  tests.push({ name, run });
}

function fixtureEvent(overrides: Partial<HubEvent> = {}): HubEvent {
  return {
    id: "tauri-fixture-ai",
    type: "ai",
    source: "mock",
    createdAt: 1780743600000,
    progress: 64,
    payload: {
      id: "tauri-fixture-ai-task",
      type: "ai",
      title: "Tauri IPC fixture",
      subtitle: "Boundary smoke event from native fixture command",
      progress: 64,
      accent: "blue",
    },
    metadata: {
      runtime: "tauri",
      fixture: true,
    },
    ...overrides,
  };
}

function assertDiagnosticContext(
  diagnostic: TauriRuntimeDiagnostic,
  expected: Pick<TauriRuntimeDiagnostic, "surface" | "command">,
) {
  assert.equal(diagnostic.surface, expected.surface);
  assert.equal(diagnostic.command, expected.command);
}

test("detects unavailable Tauri invoke", async () => {
  const result = await loadTauriFixtureHubEvents();

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "unavailable");
  assertDiagnosticContext(result.diagnostic, {
    surface: "fixtureEvents",
    command: TAURI_FIXTURE_COMMAND,
  });
});

test("finds global Tauri core invoke when present", () => {
  const invoke: TauriInvoke = async () => [];

  assert.equal(getTauriInvoke({ __TAURI__: { core: { invoke } } }), invoke);
});

test("returns malformed diagnostic for non-canonical fixture payloads", async () => {
  const result = await loadTauriFixtureHubEvents({
    invoke: async () => [
      {
        id: "bad",
        type: "unknown",
        source: "mock",
        createdAt: Date.now(),
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "malformed");
  assertDiagnosticContext(result.diagnostic, {
    surface: "fixtureEvents",
    command: TAURI_FIXTURE_COMMAND,
  });
});

test("returns invoke-failed diagnostic when command rejects", async () => {
  const result = await loadTauriFixtureHubEvents({
    invoke: async () => {
      throw new Error("native boundary failed");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "invoke-failed");
  assertDiagnosticContext(result.diagnostic, {
    surface: "fixtureEvents",
    command: TAURI_FIXTURE_COMMAND,
  });
  assert.equal(result.diagnostic.detail, "native boundary failed");
});

test("loads canonical fixture events through the configured command", async () => {
  const calls: string[] = [];
  const result = await loadTauriFixtureHubEvents({
    invoke: async (command) => {
      calls.push(command);
      return [fixtureEvent()];
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [TAURI_FIXTURE_COMMAND]);

  if (result.ok) {
    assert.equal(result.events[0]?.type, "ai");
    assert.equal(result.events[0]?.source, "mock");
    assert.equal(result.events[0]?.metadata?.runtime, "tauri");
  }
});

test("publishes canonical fixture events through the event bus boundary", async () => {
  const publishedEvents: HubEvent[] = [];
  const result = await publishTauriFixtureEvents(
    {
      publishHubEvent(event) {
        publishedEvents.push(event);
      },
    },
    {
      invoke: async () => [fixtureEvent()],
    },
  );

  assert.equal(result.ok, true);
  assert.equal(publishedEvents.length, 1);
  assert.equal(publishedEvents[0]?.id, "tauri-fixture-ai");
  assert.equal(publishedEvents[0]?.type, "ai");
  assert.equal(publishedEvents[0]?.source, "mock");
  assert.equal(publishedEvents[0]?.metadata?.runtime, "tauri");
});

test("does not publish when Tauri invoke is unavailable", async () => {
  const publishedEvents: HubEvent[] = [];
  const result = await publishTauriFixtureEvents({
    publishHubEvent(event) {
      publishedEvents.push(event);
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "unavailable");
  assert.equal(publishedEvents.length, 0);
});

test("does not publish malformed fixture payloads", async () => {
  const publishedEvents: HubEvent[] = [];
  const result = await publishTauriFixtureEvents(
    {
      publishHubEvent(event) {
        publishedEvents.push(event);
      },
    },
    {
      invoke: async () => [fixtureEvent({ type: "unknown" as HubEvent["type"] })],
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "malformed");
  assert.equal(publishedEvents.length, 0);
});

test("does not publish when fixture command fails", async () => {
  const publishedEvents: HubEvent[] = [];
  const result = await publishTauriFixtureEvents(
    {
      publishHubEvent(event) {
        publishedEvents.push(event);
      },
    },
    {
      invoke: async () => {
        throw new Error("native boundary failed");
      },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "invoke-failed");
  assert.equal(publishedEvents.length, 0);
});

test("detects unavailable Tauri capability invoke", async () => {
  const result = await loadTauriRuntimeCapabilities();

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "unavailable");
  assertDiagnosticContext(result.diagnostic, {
    surface: "runtimeCapabilities",
    command: TAURI_RUNTIME_CAPABILITIES_COMMAND,
  });
});

test("returns malformed diagnostic for non-canonical capability payloads", async () => {
  const result = await loadTauriRuntimeCapabilities({
    invoke: async () => ({
      ...canonicalRuntimeCapabilities,
      tray: true,
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "malformed");
  assertDiagnosticContext(result.diagnostic, {
    surface: "runtimeCapabilities",
    command: TAURI_RUNTIME_CAPABILITIES_COMMAND,
  });
});

test("returns malformed diagnostic for non-canonical shell window facts", async () => {
  const result = await loadTauriRuntimeCapabilities({
    invoke: async () => ({
      ...canonicalRuntimeCapabilities,
      configuredShellWindow: {
        ...canonicalRuntimeCapabilities.configuredShellWindow,
        configured: false,
      },
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "malformed");
  assertDiagnosticContext(result.diagnostic, {
    surface: "runtimeCapabilities",
    command: TAURI_RUNTIME_CAPABILITIES_COMMAND,
  });
});

test("returns invoke-failed diagnostic when capability command rejects", async () => {
  const result = await loadTauriRuntimeCapabilities({
    invoke: async () => {
      throw new Error("capability boundary failed");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostic.code, "invoke-failed");
  assertDiagnosticContext(result.diagnostic, {
    surface: "runtimeCapabilities",
    command: TAURI_RUNTIME_CAPABILITIES_COMMAND,
  });
  assert.equal(result.diagnostic.detail, "capability boundary failed");
});

test("loads canonical runtime capability facts through the configured command", async () => {
  const calls: string[] = [];
  const result = await loadTauriRuntimeCapabilities({
    invoke: async (command) => {
      calls.push(command);
      return canonicalRuntimeCapabilities;
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [TAURI_RUNTIME_CAPABILITIES_COMMAND]);

  if (result.ok) {
    assert.deepEqual(result.capabilities, canonicalRuntimeCapabilities);
  }
});

test("keeps runtime Windows provider facts compatible with music preflight diagnostics", async () => {
  const result = await loadTauriRuntimeCapabilities({
    invoke: async () => canonicalRuntimeCapabilities,
  });
  const musicPreflightDiagnostic: HubProviderCapability = {
    id: "music",
    kind: "music",
    origin: "native",
    support: "preflight",
  };

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.capabilities.windowsProviders, false);
    assert.deepEqual(musicPreflightDiagnostic, {
      id: "music",
      kind: "music",
      origin: "native",
      support: "preflight",
    });
    assert.notEqual(musicPreflightDiagnostic.support, "available");
    assert.equal("ready" in musicPreflightDiagnostic, false);
    assert.equal("connected" in musicPreflightDiagnostic, false);
    assert.equal("implemented" in musicPreflightDiagnostic, false);
    assert.equal("active" in musicPreflightDiagnostic, false);
  }
});

for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`not ok ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}
