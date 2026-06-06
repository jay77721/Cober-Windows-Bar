export type HubMode =
  | "idle"
  | "music"
  | "aiProgress"
  | "download"
  | "notification"
  | "multiTask";

export type HubTaskType = "music" | "ai" | "download" | "notification";

export type HubTask = {
  id: string;
  type: HubTaskType;
  title: string;
  subtitle: string;
  progress?: number;
  accent: "pink" | "blue" | "green" | "cyan";
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
