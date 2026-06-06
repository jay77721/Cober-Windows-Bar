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
