export type HubMode =
  | "idle"
  | "music"
  | "aiProgress"
  | "download"
  | "notification"
  | "multiTask";

export type HubTaskType = "music" | "ai" | "download" | "notification";

export type HubEventType = HubTaskType;

export type HubEventSource = "mock" | "system" | "music" | "download" | "ai" | "notification";

export type SystemPerformanceMetricId = "cpu" | "memory" | "network";

export type SystemPerformanceMetricTone = "blue" | "violet" | "cyan";

export type SystemPerformanceMetric = {
  id: SystemPerformanceMetricId;
  label: string;
  value: number;
  tone: SystemPerformanceMetricTone;
};

export type SystemPerformanceSnapshot = {
  cpu: number;
  memory: number;
  network: number;
};

export type DesktopStatusPreferenceKey = "alwaysFloat" | "avoidFullscreen" | "lockPosition";

export type DesktopStatusPreferences = Record<DesktopStatusPreferenceKey, boolean>;

export type DesktopStatusLabels = {
  metrics: Record<SystemPerformanceMetricId, string>;
  currentUsage: string;
  menu: {
    refreshData: string;
    alwaysFloat: string;
    avoidFullscreen: string;
    lockPosition: string;
    resetPosition: string;
    openSettings: string;
    quit: string;
  };
};

export type DesktopStatusMenuAction = {
  id: string;
  label: string;
  kind: "action" | "toggle";
  preferenceKey?: DesktopStatusPreferenceKey;
};

export type DesktopStatusConfig = {
  preferences: DesktopStatusPreferences;
  labels: DesktopStatusLabels;
  menuActions: DesktopStatusMenuAction[];
};

export type HubTask = {
  id: string;
  type: HubTaskType;
  title: string;
  subtitle: string;
  progress?: number;
  accent: "pink" | "blue" | "green" | "cyan";
};

export type HubEvent = {
  id: string;
  type: HubEventType;
  source: HubEventSource;
  createdAt: number;
  expiresAt?: number;
  progress?: number;
  payload?: MusicState | NotificationState | HubTask;
  metadata?: Record<string, unknown>;
};

export type HubStoreState = {
  events: HubEvent[];
  mode: HubMode;
  tasks: HubTask[];
  notification?: NotificationState;
  music?: MusicState;
};

export type MusicState = {
  title: string;
  subtitle: string;
  time: string;
  progress: number;
};

export type NotificationState = {
  app: string;
  sender: string;
  message: string;
};

export type ShowcaseStep = {
  id: string;
  mode: HubMode;
  label: string;
  caption: string;
};
