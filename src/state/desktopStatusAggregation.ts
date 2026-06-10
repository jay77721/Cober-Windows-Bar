import { clampProgress, dedupeKinds } from "../shared/runtimeGuards";
import { createHubStoreState, getActiveHubEvents } from "./hubState";
import type {
  DesktopClipboardState,
  DesktopDownloadState,
  DesktopFocusState,
  DesktopMediaState,
  DesktopStatusAggregationInput,
  DesktopStatusAggregationResult,
  DesktopStatusKind,
  DesktopStatusStateMap,
  DesktopUpdateState,
  HubEvent,
  HubStoreState,
  HubTask,
  MusicState,
} from "../types/hub";

const DESKTOP_STATUS_AVAILABLE_KINDS: DesktopStatusKind[] = [
  "resident",
  "media",
  "download",
  "update",
  "clipboard",
  "focus",
];


function normalizeAvailableKinds(kinds: DesktopStatusKind[] | undefined): DesktopStatusKind[] | undefined {
  if (!kinds?.length) {
    return undefined;
  }

  return dedupeKinds(kinds.filter((kind) => DESKTOP_STATUS_AVAILABLE_KINDS.includes(kind)));
}

function snapshotMusicState(music: MusicState): DesktopMediaState {
  return {
    kind: "media",
    title: music.title,
    subtitle: "正在播放",
    source: "mock",
    artist: music.subtitle,
    timeLabel: music.time,
    progress: clampProgress(music.progress),
    accent: "violet",
  };
}

function snapshotDownloadTask(task: HubTask): DesktopDownloadState {
  return {
    kind: "download",
    title: task.title,
    subtitle: "下载任务",
    source: "mock",
    detail: task.subtitle || "传输中",
    progress: clampProgress(task.progress),
    accent: "green",
  };
}

function snapshotAiTask(task: HubTask): DesktopUpdateState {
  return {
    kind: "update",
    title: task.title,
    subtitle: "进行中",
    source: "mock",
    detail: task.subtitle || "系统任务处理中",
    progress: clampProgress(task.progress),
    accent: "orange",
  };
}

function snapshotNotificationEvent(event: HubEvent): DesktopClipboardState | DesktopFocusState | undefined {
  if (event.source === "notification") {
    const payload = event.payload && "message" in event.payload ? event.payload : undefined;

    return {
      kind: "clipboard",
      title: payload?.app ?? "桌面通知",
      subtitle: "最近消息",
      source: "mock",
      copiedText: payload?.message ?? "收到新的通知",
      detail: payload?.sender ?? "通知中心",
      accent: "blue",
    };
  }

  if (event.source === "system" && event.metadata?.["focus"] === true) {
    return {
      kind: "focus",
      title: "专注模式",
      subtitle: "系统状态",
      source: "system",
      sessionLabel: typeof event.metadata["label"] === "string" ? event.metadata["label"] : "已启用专注模式",
      detail: typeof event.metadata["detail"] === "string" ? event.metadata["detail"] : "暂不打扰",
      accent: "pink",
    };
  }

  return undefined;
}

function deriveStateOverrides(hubState: HubStoreState): Partial<DesktopStatusStateMap> {
  const overrides: Partial<DesktopStatusStateMap> = {};

  if (hubState.music) {
    overrides.media = snapshotMusicState(hubState.music);
  }

  const downloadTask = hubState.tasks.find((task) => task.type === "download");
  if (downloadTask) {
    overrides.download = snapshotDownloadTask(downloadTask);
  }

  const aiTask = hubState.tasks.find((task) => task.type === "ai");
  if (aiTask) {
    overrides.update = snapshotAiTask(aiTask);
  }

  const latestNotification = hubState.events.find((event) => event.type === "notification");
  const notificationState = latestNotification ? snapshotNotificationEvent(latestNotification) : undefined;

  if (notificationState?.kind === "clipboard") {
    overrides.clipboard = notificationState;
  }

  if (notificationState?.kind === "focus") {
    overrides.focus = notificationState;
  }

  return overrides;
}

function deriveActiveKinds(hubState: HubStoreState, events: HubEvent[]): DesktopStatusKind[] {
  const activeKinds: DesktopStatusKind[] = [];

  if (hubState.music) {
    activeKinds.push("media");
  }

  if (hubState.tasks.some((task) => task.type === "download")) {
    activeKinds.push("download");
  }

  if (hubState.tasks.some((task) => task.type === "ai")) {
    activeKinds.push("update");
  }

  if (events.some((event) => event.type === "notification" && event.source === "notification")) {
    activeKinds.push("clipboard");
  }

  if (events.some((event) => event.source === "system" && event.metadata?.["focus"] === true)) {
    activeKinds.push("focus");
  }

  return dedupeKinds(activeKinds);
}

function resolveHubState(input: DesktopStatusAggregationInput): HubStoreState {
  if (input.hubState) {
    return input.hubState;
  }

  return createHubStoreState(input.events ?? [], input.now);
}

function resolveEvents(input: DesktopStatusAggregationInput): HubEvent[] {
  if (input.events) {
    return getActiveHubEvents(input.events, input.now);
  }

  return input.hubState?.events ?? [];
}

export function aggregateDesktopStatusInput(
  input: DesktopStatusAggregationInput = {},
): DesktopStatusAggregationResult {
  const hubState = resolveHubState(input);
  const events = resolveEvents(input);
  const states = deriveStateOverrides(hubState);
  const activeKinds = deriveActiveKinds(hubState, events);
  const availableKinds = normalizeAvailableKinds(input.availableKinds);

  return {
    activeKinds,
    availableKinds,
    states: Object.keys(states).length ? states : undefined,
  };
}
