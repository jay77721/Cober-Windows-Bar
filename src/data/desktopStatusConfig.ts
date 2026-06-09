import type {
  DesktopStatusConfig,
  DesktopStatusMenuAction,
  DesktopStatusPreferenceKey,
  SystemPerformanceMetric,
  SystemPerformanceMetricId,
  SystemPerformanceSnapshot,
} from "../types/hub";

const DESKTOP_STATUS_METRIC_TONES: Record<SystemPerformanceMetricId, SystemPerformanceMetric["tone"]> = {
  cpu: "blue",
  memory: "violet",
  network: "cyan",
};

export const desktopStatusConfig: DesktopStatusConfig = {
  preferences: {
    alwaysFloat: true,
    avoidFullscreen: true,
    lockPosition: false,
  },
  labels: {
    metrics: {
      cpu: "CPU",
      memory: "\u5185\u5B58",
      network: "\u7F51\u7EDC",
    },
    currentUsage: "\u5F53\u524D\u4F7F\u7528\u7387",
    menu: {
      refreshData: "\u5237\u65B0\u6570\u636E",
      alwaysFloat: "\u603B\u662F\u60AC\u6D6E",
      avoidFullscreen: "\u5168\u5C4F\u65F6\u907F\u8BA9",
      lockPosition: "\u9501\u5B9A\u4F4D\u7F6E",
      resetPosition: "\u91CD\u7F6E\u4F4D\u7F6E",
      openSettings: "\u6253\u5F00\u8BBE\u7F6E",
      quit: "\u9000\u51FA",
    },
  },
  menuActions: [
    { id: "refresh-data", label: "\u5237\u65B0\u6570\u636E", kind: "action" },
    { id: "always-float", label: "\u603B\u662F\u60AC\u6D6E", kind: "toggle", preferenceKey: "alwaysFloat" },
    {
      id: "avoid-fullscreen",
      label: "\u5168\u5C4F\u65F6\u907F\u8BA9",
      kind: "toggle",
      preferenceKey: "avoidFullscreen",
    },
    { id: "lock-position", label: "\u9501\u5B9A\u4F4D\u7F6E", kind: "toggle", preferenceKey: "lockPosition" },
    { id: "reset-position", label: "\u91CD\u7F6E\u4F4D\u7F6E", kind: "action" },
    { id: "open-settings", label: "\u6253\u5F00\u8BBE\u7F6E", kind: "action" },
    { id: "quit", label: "\u9000\u51FA", kind: "action" },
  ],
};

export function getDesktopStatusConfig(): DesktopStatusConfig {
  return desktopStatusConfig;
}

export function getDesktopStatusLabels() {
  return desktopStatusConfig.labels;
}

export function getDesktopStatusPreferences() {
  return desktopStatusConfig.preferences;
}

export function getDesktopStatusMenuActions(): DesktopStatusMenuAction[] {
  return desktopStatusConfig.menuActions;
}

export function getDesktopStatusPreferenceEntries() {
  return desktopStatusConfig.menuActions.filter(
    (
      action,
    ): action is DesktopStatusMenuAction & {
      preferenceKey: DesktopStatusPreferenceKey;
    } => action.kind === "toggle" && Boolean(action.preferenceKey),
  );
}

export function createSystemPerformanceMetricSnapshot(
  snapshot: Pick<SystemPerformanceSnapshot, SystemPerformanceMetricId>,
): SystemPerformanceMetric[] {
  const labels = getDesktopStatusLabels().metrics;

  return (Object.keys(DESKTOP_STATUS_METRIC_TONES) as SystemPerformanceMetricId[]).map((id) => ({
    id,
    label: labels[id],
    value: snapshot[id],
    tone: DESKTOP_STATUS_METRIC_TONES[id],
  }));
}
