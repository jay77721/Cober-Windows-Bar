import { snapshotHubEvent } from "../shared/runtimeGuards";
import type { HubEvent } from "../types/hub";
import type {
  HubProvider,
  HubProviderCapability,
  HubProviderLifecycle,
  HubProviderListener,
  HubProviderMetadata,
  MockProviderOptions,
} from "./types";

type MockProviderConfig = {
  metadata: HubProviderMetadata;
  capabilities: HubProviderCapability[];
  events: () => HubEvent[];
};

const resolveNow = (options: MockProviderOptions = {}) => {
  if (typeof options.now === "function") {
    return options.now();
  }

  return options.now ?? Date.now();
};

const createEventId = (providerId: string, type: HubEvent["type"], timestamp: number) =>
  `${providerId}-${type}-${timestamp}`;

export const createMockMusicEvent = (options: MockProviderOptions = {}): HubEvent => {
  const createdAt = resolveNow(options);

  return {
    id: createEventId("mock-music", "music", createdAt),
    type: "music",
    source: "music",
    createdAt,
    progress: 68,
    payload: {
      title: "Midnight City",
      subtitle: "M83 - Hurry Up, We're Dreaming",
      time: "2:46 / 4:03",
      progress: 68,
    },
  };
};

export const createMockDownloadEvent = (options: MockProviderOptions = {}): HubEvent => {
  const createdAt = resolveNow(options);

  return {
    id: createEventId("mock-download", "download", createdAt),
    type: "download",
    source: "download",
    createdAt,
    progress: 45,
    payload: {
      id: "mock-download-task",
      type: "download",
      title: "Windows SDK Preview.zip",
      subtitle: "42.8 MB of 96 MB",
      progress: 45,
      accent: "green",
    },
  };
};

export const createMockAiTaskEvent = (options: MockProviderOptions = {}): HubEvent => {
  const createdAt = resolveNow(options);

  return {
    id: createEventId("mock-ai", "ai", createdAt),
    type: "ai",
    source: "ai",
    createdAt,
    progress: 72,
    payload: {
      id: "mock-ai-task",
      type: "ai",
      title: "Codex is updating the provider SDK",
      subtitle: "Generating mock provider contract tests",
      progress: 72,
      accent: "blue",
    },
  };
};

export const createMockNotificationEvent = (options: MockProviderOptions = {}): HubEvent => {
  const createdAt = resolveNow(options);

  return {
    id: createEventId("mock-notification", "notification", createdAt),
    type: "notification",
    source: "notification",
    createdAt,
    expiresAt: createdAt + 3000,
    payload: {
      app: "Cober",
      sender: "Mock Provider",
      message: "npm run qa passed",
    },
  };
};

const createMockProvider = ({ metadata, capabilities, events }: MockProviderConfig): HubProvider => {
  let lifecycle: HubProviderLifecycle = "Stopped";
  const listeners = new Set<HubProviderListener>();

  const emit = () => {
    if (lifecycle !== "Publishing") {
      return;
    }

    const nextEvents = events();
    listeners.forEach((listener) => {
      try {
        listener(nextEvents.map(snapshotHubEvent));
      } catch {
        // Listener failures should not block unrelated provider subscribers.
      }
    });
  };

  return {
    id: metadata.id,
    label: metadata.name,
    metadata,
    capabilities,
    start() {
      if (lifecycle === "Publishing") {
        return;
      }

      lifecycle = "Publishing";
      emit();
    },
    stop() {
      lifecycle = "Stopped";
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    status() {
      return {
        lifecycle,
        health: "Healthy",
      };
    },
  };
};

const createMockMetadata = (
  kind: HubProviderMetadata["kind"],
  name: string,
  id = `mock-${kind}-provider`,
): HubProviderMetadata => ({
  id,
  name,
  kind,
  version: "0.6.0",
  mock: true,
});

const createMockCapabilities = (
  kind: HubProviderCapability["kind"],
): HubProviderCapability[] => [
  {
    id: kind,
    kind,
    origin: "mock",
    support: "available",
  },
];

export const createMockMusicProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    metadata: createMockMetadata("music", "Mock Music Provider"),
    capabilities: createMockCapabilities("music"),
    events: () => [createMockMusicEvent(options)],
  });

export const createMockDownloadProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    metadata: createMockMetadata("download", "Mock Download Provider"),
    capabilities: createMockCapabilities("download"),
    events: () => [createMockDownloadEvent(options)],
  });

export const createMockAIProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    metadata: createMockMetadata("ai", "Mock AI Provider", "mock-ai-task-provider"),
    capabilities: createMockCapabilities("ai"),
    events: () => [createMockAiTaskEvent(options)],
  });

export const createMockAiTaskProvider = createMockAIProvider;

export const createMockNotificationProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    metadata: createMockMetadata("notification", "Mock Notification Provider"),
    capabilities: createMockCapabilities("notification"),
    events: () => [createMockNotificationEvent(options)],
  });
