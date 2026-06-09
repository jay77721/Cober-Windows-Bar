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

export type DesktopStatusKind =
  | "resident"
  | "media"
  | "download"
  | "update"
  | "clipboard"
  | "focus";

export type DesktopStatusSource = "default" | "mock" | "system";

export type DesktopStatusAccentTone = "blue" | "violet" | "cyan" | "green" | "orange" | "pink";

export type DesktopStatusTemplateDescriptor = {
  kind: DesktopStatusKind;
  label: string;
  description: string;
  providerHint: string;
};

export type DesktopStatusBaseState = {
  kind: DesktopStatusKind;
  title: string;
  subtitle: string;
  source: DesktopStatusSource;
};

export type DesktopResidentState = DesktopStatusBaseState & {
  kind: "resident";
  metrics: SystemPerformanceMetric[];
};

export type DesktopMediaState = DesktopStatusBaseState & {
  kind: "media";
  progress: number;
  artist: string;
  timeLabel: string;
  accent: DesktopStatusAccentTone;
};

export type DesktopDownloadState = DesktopStatusBaseState & {
  kind: "download";
  progress: number;
  detail: string;
  accent: DesktopStatusAccentTone;
};

export type DesktopUpdateState = DesktopStatusBaseState & {
  kind: "update";
  progress: number;
  detail: string;
  accent: DesktopStatusAccentTone;
};

export type DesktopClipboardState = DesktopStatusBaseState & {
  kind: "clipboard";
  copiedText: string;
  detail: string;
  accent: DesktopStatusAccentTone;
};

export type DesktopFocusState = DesktopStatusBaseState & {
  kind: "focus";
  sessionLabel: string;
  detail: string;
  accent: DesktopStatusAccentTone;
};

export type DesktopStatusState =
  | DesktopResidentState
  | DesktopMediaState
  | DesktopDownloadState
  | DesktopUpdateState
  | DesktopClipboardState
  | DesktopFocusState;

export type DesktopStatusStateMap = {
  resident: DesktopResidentState;
  media: DesktopMediaState;
  download: DesktopDownloadState;
  update: DesktopUpdateState;
  clipboard: DesktopClipboardState;
  focus: DesktopFocusState;
};

export type DesktopStatusResolverInput = {
  metrics: SystemPerformanceMetric[];
  preferredKind?: DesktopStatusKind;
  activeKinds?: DesktopStatusKind[];
  availableKinds?: DesktopStatusKind[];
  states?: Partial<DesktopStatusStateMap>;
  now?: number;
  previousKind?: DesktopStatusKind;
  previousChangedAt?: number;
  preferredUntil?: number;
  activatedAtByKind?: Partial<Record<DesktopStatusKind, number>>;
};

export type DesktopStatusSchedulerInput = Pick<
  DesktopStatusResolverInput,
  "preferredKind" | "activeKinds"
> & {
  availableKinds?: DesktopStatusKind[];
  now?: number;
  previousKind?: DesktopStatusKind;
  previousChangedAt?: number;
  preferredUntil?: number;
  activatedAtByKind?: Partial<Record<DesktopStatusKind, number>>;
};

export type DesktopStatusScheduleDecision = {
  kind: DesktopStatusKind;
  reason: "preferred" | "priority" | "fallback";
  changed: boolean;
};

export type DesktopStatusAggregationInput = {
  hubState?: HubStoreState;
  events?: HubEvent[];
  now?: number;
  availableKinds?: DesktopStatusKind[];
};

export type DesktopStatusAggregationResult = {
  activeKinds: DesktopStatusKind[];
  availableKinds?: DesktopStatusKind[];
  states?: Partial<DesktopStatusStateMap>;
};

export type DesktopStatusPreferenceKey = "alwaysFloat" | "avoidFullscreen" | "lockPosition";

export type DesktopStatusPreferences = Record<DesktopStatusPreferenceKey, boolean>;

export type DesktopStatusMenuActionId =
  | "refresh-data"
  | "always-float"
  | "avoid-fullscreen"
  | "lock-position"
  | "toggle-always-float"
  | "toggle-avoid-fullscreen"
  | "toggle-lock-position"
  | "reset-position"
  | "open-settings"
  | "quit";

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
  id: DesktopStatusMenuActionId;
  label: string;
  kind: "action" | "toggle";
  preferenceKey?: DesktopStatusPreferenceKey;
};

export type DesktopStatusPreferencesPayload = {
  preferences: DesktopStatusPreferences;
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
