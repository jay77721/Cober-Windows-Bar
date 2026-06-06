import type { HubEvent } from "../types/hub";
import type { HubProvider, HubProviderListener, MockProviderOptions } from "./types";

type MockProviderConfig = {
  id: string;
  label: string;
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

const createMockProvider = ({ id, label, events }: MockProviderConfig): HubProvider => {
  let running = false;
  const listeners = new Set<HubProviderListener>();

  const emit = () => {
    if (!running) {
      return;
    }

    const nextEvents = events();
    listeners.forEach((listener) => listener(nextEvents));
  };

  return {
    id,
    label,
    start() {
      running = true;
      emit();
    },
    stop() {
      running = false;
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getStatus() {
      return running ? "running" : "stopped";
    },
  };
};

export const createMockMusicProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    id: "mock-music-provider",
    label: "Mock Music Provider",
    events: () => [createMockMusicEvent(options)],
  });

export const createMockDownloadProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    id: "mock-download-provider",
    label: "Mock Download Provider",
    events: () => [createMockDownloadEvent(options)],
  });

export const createMockAiTaskProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    id: "mock-ai-task-provider",
    label: "Mock AI Task Provider",
    events: () => [createMockAiTaskEvent(options)],
  });

export const createMockNotificationProvider = (options: MockProviderOptions = {}) =>
  createMockProvider({
    id: "mock-notification-provider",
    label: "Mock Notification Provider",
    events: () => [createMockNotificationEvent(options)],
  });

export const createMockProviders = () => [
  createMockMusicProvider(),
  createMockDownloadProvider(),
  createMockAiTaskProvider(),
  createMockNotificationProvider(),
];
