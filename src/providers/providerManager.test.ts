import { strict as assert } from "node:assert";
import { describe, it, vi, beforeEach } from "vitest";
import type { HubEventBus } from "../state/hubState";
import type { HubProvider, HubProviderStatus } from "./types";
import type { ProviderConnection } from "./providerAdapter";

// ── Hoisted: create test doubles available to both mock factories and test code ──

const { providerFactories, connectMock, disconnectMock, mockEventBus } = vi.hoisted(
  () => {
    const disconnectMock = vi.fn();

    function makeSpyProvider(id: string, kind: string) {
      let lifecycle: "Stopped" | "Publishing" = "Stopped";
      return {
        id,
        label: `Spy Provider ${kind}`,
        metadata: {
          id,
          name: `Spy Provider ${kind}`,
          kind,
          version: "0.6.0",
          mock: false,
        },
        capabilities: [
          { id: kind, kind, origin: "mock" as const, support: "available" as const },
        ],
        start() {
          lifecycle = "Publishing";
        },
        stop() {
          lifecycle = "Stopped";
        },
        subscribe: () => () => {},
        status: () => ({ lifecycle, health: "Healthy" }),
      };
    }

    return {
      providerFactories: {
        createMockMusicProvider: vi.fn(() => makeSpyProvider("mock-music-provider", "music")),
        createMockDownloadProvider: vi.fn(() => makeSpyProvider("mock-download-provider", "download")),
        createMockAIProvider: vi.fn(() => makeSpyProvider("mock-ai-task-provider", "ai")),
        createMockNotificationProvider: vi.fn(() => makeSpyProvider("mock-notification-provider", "notification")),
        createRealClipboardProvider: vi.fn(() => makeSpyProvider("real-clipboard-provider", "clipboard")),
        createRealFocusProvider: vi.fn(() => makeSpyProvider("real-focus-provider", "focus")),
        createRealGitProvider: vi.fn(() => makeSpyProvider("real-git-provider", "git")),
        createRealMediaSessionProvider: vi.fn(() => makeSpyProvider("real-media-session-provider", "media")),
        createRealSystemPerformanceProvider: vi.fn(() => makeSpyProvider("real-system-performance-provider", "system")),
        createRealDownloadProvider: vi.fn(() => makeSpyProvider("real-download-provider", "download")),
        createRealUpdateProvider: vi.fn(() => makeSpyProvider("real-update-provider", "ai")),
      },
      connectMock: vi.fn(() => ({ disconnect: disconnectMock } satisfies ProviderConnection)),
      disconnectMock,
      mockEventBus: {
        getState: vi.fn(),
        publishHubEvent: vi.fn(),
        replaceHubEvents: vi.fn(),
        clearHubEvents: vi.fn(),
        clearExpiredEvents: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
      } satisfies Partial<HubEventBus>,
    };
  },
);

// ── Mock provider factory modules ─────────────────────────────────────

vi.mock("./mockProviders", () => ({
  createMockMusicProvider: providerFactories.createMockMusicProvider,
  createMockDownloadProvider: providerFactories.createMockDownloadProvider,
  createMockAIProvider: providerFactories.createMockAIProvider,
  createMockNotificationProvider: providerFactories.createMockNotificationProvider,
}));

vi.mock("./realClipboardProvider", () => ({
  createRealClipboardProvider: providerFactories.createRealClipboardProvider,
}));

vi.mock("./realDownloadProvider", () => ({
  createRealDownloadProvider: providerFactories.createRealDownloadProvider,
}));

vi.mock("./realFocusProvider", () => ({
  createRealFocusProvider: providerFactories.createRealFocusProvider,
}));

vi.mock("./realGitProvider", () => ({
  createRealGitProvider: providerFactories.createRealGitProvider,
}));

vi.mock("./realUpdateProvider", () => ({
  createRealUpdateProvider: providerFactories.createRealUpdateProvider,
}));

vi.mock("./realMediaSessionProvider", () => ({
  createRealMediaSessionProvider: providerFactories.createRealMediaSessionProvider,
}));

vi.mock("./realSystemPerformanceProvider", () => ({
  createRealSystemPerformanceProvider: providerFactories.createRealSystemPerformanceProvider,
}));

vi.mock("./providerAdapter", () => ({
  connectProviderToEventBus: connectMock,
}));

// ── Import after mocks ────────────────────────────────────────────────

import { createProviderManager } from "./providerManager";
import type { ProviderManagerOptions } from "./providerManager";

// ── Helpers ───────────────────────────────────────────────────────────

function createManager(options?: ProviderManagerOptions) {
  return createProviderManager(mockEventBus as unknown as HubEventBus, options);
}

function assertAllLifecycle(
  manager: ReturnType<typeof createProviderManager>,
  expected: "Stopped" | "Publishing",
) {
  for (const record of manager.registry.list()) {
    assert.equal(
      record.status.lifecycle,
      expected,
      `expected ${record.id} to be ${expected}, got ${record.status.lifecycle}`,
    );
  }
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("createProviderManager", () => {
  beforeEach(() => {
    connectMock.mockClear();
    disconnectMock.mockClear();
    // Clear all event bus method mocks
    for (const key of Object.keys(mockEventBus) as (keyof typeof mockEventBus)[]) {
      const maybeFn = mockEventBus[key];
      if (typeof maybeFn === "function") {
        (maybeFn as ReturnType<typeof vi.fn>).mockClear();
      }
    }
  });

  // ── Default creation ────────────────────────────────────────────────

  it("registers all 11 providers (7 real + 4 mock) by default", () => {
    const manager = createManager();
    const ids = manager.listProviderIds();

    assert.equal(ids.length, 11);
    assert.deepEqual(ids, [
      "real-clipboard-provider",
      "real-download-provider",
      "real-focus-provider",
      "real-git-provider",
      "real-media-session-provider",
      "real-system-performance-provider",
      "real-update-provider",
      "mock-music-provider",
      "mock-download-provider",
      "mock-ai-task-provider",
      "mock-notification-provider",
    ]);
  });

  it("lists provider IDs in registration order", () => {
    const manager = createManager();
    const ids = manager.listProviderIds();

    // Real providers registered first (order: clipboard, download, focus,
    // git, media, system, update), then mock providers (music, download, ai, notification)
    assert.equal(ids[0], "real-clipboard-provider");
    assert.equal(ids[3], "real-git-provider");
    assert.equal(ids[7], "mock-music-provider");
    assert.equal(ids[10], "mock-notification-provider");
  });

  // ── Options: realProviders / mockProviders ──────────────────────────

  it('supports realProviders: false — registers only mock providers', () => {
    const manager = createManager({ realProviders: false });
    const ids = manager.listProviderIds();

    assert.equal(ids.length, 4);
    for (const id of ids) {
      assert.ok(id.startsWith("mock-"), `expected mock prefix, got ${id}`);
    }
  });

  it('supports mockProviders: false — registers only real providers', () => {
    const manager = createManager({ mockProviders: false });
    const ids = manager.listProviderIds();

    assert.equal(ids.length, 7);
    for (const id of ids) {
      assert.ok(id.startsWith("real-"), `expected real prefix, got ${id}`);
    }
  });

  it('supports both false — registers zero providers', () => {
    const manager = createManager({ realProviders: false, mockProviders: false });

    assert.equal(manager.listProviderIds().length, 0);
  });

  it("defaults realProviders and mockProviders to true when options is empty", () => {
    const manager = createManager({});

    assert.equal(manager.listProviderIds().length, 11);
  });

  it("defaults realProviders and mockProviders to true when options is undefined", () => {
    const manager = createProviderManager(mockEventBus as unknown as HubEventBus);

    assert.equal(manager.listProviderIds().length, 11);
  });

  // ── start() ─────────────────────────────────────────────────────────

  it("start() transitions all providers to Publishing lifecycle", () => {
    const manager = createManager();

    manager.start();

    assertAllLifecycle(manager, "Publishing");
  });

  it("start() creates event bus connections for each provider", () => {
    const manager = createManager();

    manager.start();

    // connectProviderToEventBus called once per provider
    assert.equal(connectMock.mock.calls.length, 11);
  });

  it("start() is idempotent — disconnects old connections before creating new ones", () => {
    const manager = createManager();

    manager.start(); // first: creates 11 connections
    const firstDisconnectCount = disconnectMock.mock.calls.length;

    // Actually, let's track properly
    disconnectMock.mockClear();
    connectMock.mockClear();

    manager.start(); // second: disconnects 11 old, creates 11 new

    // Second start disconnected the 11 from first start, then connected 11 new
    assert.equal(disconnectMock.mock.calls.length, 11);
    assert.equal(connectMock.mock.calls.length, 11);
  });

  // ── stop() ──────────────────────────────────────────────────────────

  it("stop() transitions all providers to Stopped lifecycle", () => {
    const manager = createManager();

    manager.start();
    manager.stop();

    assertAllLifecycle(manager, "Stopped");
  });

  it("stop() disconnects all event bus connections", () => {
    const manager = createManager();

    manager.start();
    disconnectMock.mockClear();

    manager.stop();

    assert.equal(disconnectMock.mock.calls.length, 11);
  });

  it("stop() clears the connections array", () => {
    const manager = createManager();

    manager.start();
    disconnectMock.mockClear();

    manager.stop();

    // Second stop should not disconnect anything (connections already cleared)
    disconnectMock.mockClear();
    manager.stop();
    assert.equal(disconnectMock.mock.calls.length, 0);
  });

  // ── Duplicate registration ──────────────────────────────────────────

  it("duplicate provider IDs are rejected by the registry", () => {
    const manager = createManager();

    const duplicate: HubProvider = {
      id: "mock-music-provider",
      label: "Duplicate Music",
      metadata: {
        id: "mock-music-provider",
        name: "Duplicate Music",
        kind: "music",
        version: "0.6.0",
        mock: true,
      },
      capabilities: [
        { id: "music", kind: "music", origin: "mock", support: "available" },
      ],
      start: () => {},
      stop: () => {},
      subscribe: () => () => {},
      status: (): HubProviderStatus => ({ lifecycle: "Stopped", health: "Healthy" }),
    };

    const result = manager.registry.register(duplicate);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "duplicate-provider-id");
      assert.equal(result.id, "mock-music-provider");
    }
  });

  // ── listProviderIds() ────────────────────────────────────────────────

  it("listProviderIds() returns all registered provider IDs", () => {
    const manager = createManager();
    const expected = [
      "real-clipboard-provider",
      "real-download-provider",
      "real-focus-provider",
      "real-git-provider",
      "real-media-session-provider",
      "real-system-performance-provider",
      "real-update-provider",
      "mock-music-provider",
      "mock-download-provider",
      "mock-ai-task-provider",
      "mock-notification-provider",
    ];

    assert.deepEqual(manager.listProviderIds(), expected);
  });

  it("listProviderIds() returns fresh array on each call", () => {
    const manager = createManager();

    const first = manager.listProviderIds();
    const second = manager.listProviderIds();

    assert.notEqual(first, second);
    assert.deepEqual(first, second);

    // Mutation of one does not affect the other
    first.pop();
    assert.equal(first.length, 10);
    assert.equal(second.length, 11);
  });

  // ── Safety: empty manager ───────────────────────────────────────────

  it("start() does not throw when no providers are registered", () => {
    const manager = createManager({ realProviders: false, mockProviders: false });

    assert.doesNotThrow(() => manager.start());
  });

  it("stop() does not throw when no providers are registered", () => {
    const manager = createManager({ realProviders: false, mockProviders: false });

    assert.doesNotThrow(() => manager.stop());
  });

  it("start() followed by stop() is safe on an empty manager", () => {
    const manager = createManager({ realProviders: false, mockProviders: false });

    assert.doesNotThrow(() => {
      manager.start();
      manager.stop();
    });
  });

  // ── Registry access ─────────────────────────────────────────────────

  it("exposes the underlying registry for introspection", () => {
    const manager = createManager({ mockProviders: false });
    const records = manager.registry.list();

    assert.equal(records.length, 7);
    assert.ok("status" in records[0]!);
    assert.ok("metadata" in records[0]!);
    assert.ok("capabilities" in records[0]!);
  });

  it("registry snapshots reflect start/stop transitions", () => {
    const manager = createManager({ realProviders: false });

    // Before start — Stopped
    for (const record of manager.registry.list()) {
      assert.equal(record.status.lifecycle, "Stopped");
    }

    manager.start();

    // After start — Publishing
    for (const record of manager.registry.list()) {
      assert.equal(record.status.lifecycle, "Publishing");
    }

    manager.stop();

    // After stop — Stopped
    for (const record of manager.registry.list()) {
      assert.equal(record.status.lifecycle, "Stopped");
    }
  });
});