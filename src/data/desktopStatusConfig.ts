import type {
  DesktopStatusConfig,
  DesktopStatusKind,
  DesktopStatusMenuAction,
  DesktopStatusPreferenceKey,
  DesktopStatusStateMap,
  DesktopStatusTemplateDescriptor,
  SystemPerformanceMetric,
  SystemPerformanceMetricId,
  SystemPerformanceSnapshot,
} from "../types/hub";

const DESKTOP_STATUS_METRIC_TONES: Record<SystemPerformanceMetricId, SystemPerformanceMetric["tone"]> = {
  cpu: "blue",
  memory: "violet",
  network: "cyan",
};

export const DESKTOP_STATUS_TEMPLATE_ORDER: DesktopStatusKind[] = [
  "resident",
  "media",
  "download",
  "update",
  "clipboard",
  "focus",
];

export const DESKTOP_STATUS_TEMPLATE_DESCRIPTORS: DesktopStatusTemplateDescriptor[] = [
  {
    kind: "resident",
    label: "常驻态",
    description: "默认展示 CPU、内存和网络三项核心指标。",
    providerHint: "system performance",
  },
  {
    kind: "media",
    label: "媒体态",
    description: "播放中的媒体信息与进度。",
    providerHint: "media session",
  },
  {
    kind: "download",
    label: "下载态",
    description: "下载任务与传输进度。",
    providerHint: "download watcher",
  },
  {
    kind: "update",
    label: "更新态",
    description: "系统或应用更新进度。",
    providerHint: "update service",
  },
  {
    kind: "clipboard",
    label: "剪贴板态",
    description: "最近复制内容与来源。",
    providerHint: "clipboard watcher",
  },
  {
    kind: "focus",
    label: "专注态",
    description: "专注模式或计时状态。",
    providerHint: "focus assist",
  },
];

export const desktopStatusConfig: DesktopStatusConfig = {
  preferences: {
    alwaysFloat: true,
    avoidFullscreen: true,
    lockPosition: false,
  },
  labels: {
    metrics: {
      cpu: "CPU",
      memory: "内存",
      network: "网络",
    },
    currentUsage: "当前使用率",
    menu: {
      refreshData: "刷新数据",
      alwaysFloat: "总是悬浮",
      avoidFullscreen: "全屏时避让",
      lockPosition: "锁定位置",
      resetPosition: "重置位置",
      openSettings: "打开设置",
      quit: "退出",
    },
  },
  menuActions: [
    { id: "refresh-data", label: "刷新数据", kind: "action" },
    { id: "always-float", label: "总是悬浮", kind: "toggle", preferenceKey: "alwaysFloat" },
    {
      id: "avoid-fullscreen",
      label: "全屏时避让",
      kind: "toggle",
      preferenceKey: "avoidFullscreen",
    },
    { id: "lock-position", label: "锁定位置", kind: "toggle", preferenceKey: "lockPosition" },
    { id: "reset-position", label: "重置位置", kind: "action" },
    { id: "open-settings", label: "打开设置", kind: "action" },
    { id: "quit", label: "退出", kind: "action" },
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

export function createDesktopStatusStateTemplates(
  metrics: SystemPerformanceMetric[],
): DesktopStatusStateMap {
  return {
    resident: {
      kind: "resident",
      title: "系统性能",
      subtitle: "常驻状态中心",
      source: "system",
      metrics: metrics.map((metric) => ({ ...metric })),
    },
    media: {
      kind: "media",
      title: "Neon Focus",
      subtitle: "正在播放",
      source: "mock",
      artist: "Cober Player",
      timeLabel: "01:42 / 03:28",
      progress: 48,
      accent: "violet",
    },
    download: {
      kind: "download",
      title: "Windows ISO",
      subtitle: "下载任务",
      source: "mock",
      detail: "3.1 GB / 5.4 GB",
      progress: 57,
      accent: "green",
    },
    update: {
      kind: "update",
      title: "系统更新",
      subtitle: "准备重启",
      source: "mock",
      detail: "KB5039302",
      progress: 81,
      accent: "orange",
    },
    clipboard: {
      kind: "clipboard",
      title: "已复制内容",
      subtitle: "剪贴板更新",
      source: "mock",
      copiedText: "https://github.com/jay77721/Cober-Windows-Bar",
      detail: "来自浏览器",
      accent: "blue",
    },
    focus: {
      kind: "focus",
      title: "专注模式",
      subtitle: "已开启",
      source: "mock",
      sessionLabel: "深度工作 25 分钟",
      detail: "剩余 12 分钟",
      accent: "pink",
    },
  };
}
