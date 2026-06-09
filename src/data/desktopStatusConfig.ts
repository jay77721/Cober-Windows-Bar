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

const COPY = {
  templateDescriptors: [
    {
      kind: "resident",
      label: "常驻态",
      description: "默认展示 CPU、内存和网络三项核心指标。",
      providerHint: "system performance",
    },
    {
      kind: "media",
      label: "媒体态",
      description: "展示正在播放的媒体信息与进度。",
      providerHint: "media session",
    },
    {
      kind: "download",
      label: "下载态",
      description: "展示下载任务和传输进度。",
      providerHint: "download watcher",
    },
    {
      kind: "update",
      label: "更新态",
      description: "展示系统或应用更新进度。",
      providerHint: "update service",
    },
    {
      kind: "clipboard",
      label: "剪贴板态",
      description: "展示最近复制内容与来源。",
      providerHint: "clipboard watcher",
    },
    {
      kind: "focus",
      label: "专注态",
      description: "展示专注模式或计时状态。",
      providerHint: "focus assist",
    },
  ] satisfies DesktopStatusTemplateDescriptor[],
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
  residentState: {
    title: "系统性能",
    subtitle: "常驻状态中心",
  },
  mediaState: {
    title: "Neon Focus",
    subtitle: "正在播放",
    artist: "Cober Player",
    timeLabel: "01:42 / 03:28",
  },
  downloadState: {
    title: "Windows ISO",
    subtitle: "下载任务",
    detail: "3.1 GB / 5.4 GB",
  },
  updateState: {
    title: "系统更新",
    subtitle: "准备重启",
    detail: "KB5039302",
  },
  clipboardState: {
    title: "已复制内容",
    subtitle: "剪贴板更新",
    detail: "来自浏览器",
    copiedText: "https://github.com/jay77721/Cober-Windows-Bar",
  },
  focusState: {
    title: "专注模式",
    subtitle: "已开启",
    sessionLabel: "深度工作 25 分钟",
    detail: "剩余 12 分钟",
  },
  templateChrome: {
    residentEyebrow: "常驻态",
    mediaEyebrow: "媒体态",
    downloadEyebrow: "下载态",
    updateEyebrow: "更新态",
    clipboardEyebrow: "剪贴板态",
    focusEyebrow: "专注态",
    mediaProgress: "媒体进度",
    downloadProgress: "下载进度",
    updateProgress: "更新进度",
  },
  shell: {
    ariaLabel: "Cober Windows 状态中心",
  },
  settings: {
    panel: {
      ariaLabel: "状态中心设置",
      title: "状态中心设置",
      description: "整理桌面悬浮状态的显示方式与模板入口。",
      closeLabel: "关闭设置",
    },
    sections: {
      windowBehavior: "窗口行为",
      statusTemplates: "状态模板",
    },
    toggles: {
      alwaysFloat: {
        title: "始终悬浮",
        description: "让状态中心保持在桌面前景。",
        activeLabel: "当前已开启",
        inactiveLabel: "当前已关闭",
      },
      avoidFullscreen: {
        title: "全屏时避让",
        description: "检测到全屏应用时自动避开覆盖。",
        activeLabel: "当前已开启",
        inactiveLabel: "当前已关闭",
      },
      lockPosition: {
        title: "锁定位置",
        description: "固定当前停靠位置，避免误拖动。",
        activeLabel: "当前位置已锁定",
        inactiveLabel: "可自由拖动",
      },
    },
    actions: {
      refresh: "刷新数据",
      resetPosition: "重置位置",
      openNativeSettings: "打开原生设置入口",
      recallStatusCenter: "召回状态中心",
    },
  },
} as const;

export const DESKTOP_STATUS_TEMPLATE_ORDER: DesktopStatusKind[] = [
  "resident",
  "media",
  "download",
  "update",
  "clipboard",
  "focus",
];

export const DESKTOP_STATUS_PRIORITY_ORDER: DesktopStatusKind[] = [
  "focus",
  "update",
  "download",
  "media",
  "clipboard",
  "resident",
];

export const DESKTOP_STATUS_TEMPLATE_DESCRIPTORS: DesktopStatusTemplateDescriptor[] = [
  ...COPY.templateDescriptors,
];

export const desktopStatusConfig: DesktopStatusConfig = {
  preferences: {
    alwaysFloat: true,
    avoidFullscreen: true,
    lockPosition: false,
  },
  labels: COPY.labels,
  menuActions: [
    { id: "refresh-data", label: COPY.labels.menu.refreshData, kind: "action" },
    { id: "always-float", label: COPY.labels.menu.alwaysFloat, kind: "toggle", preferenceKey: "alwaysFloat" },
    { id: "avoid-fullscreen", label: COPY.labels.menu.avoidFullscreen, kind: "toggle", preferenceKey: "avoidFullscreen" },
    { id: "lock-position", label: COPY.labels.menu.lockPosition, kind: "toggle", preferenceKey: "lockPosition" },
    { id: "reset-position", label: COPY.labels.menu.resetPosition, kind: "action" },
    { id: "open-settings", label: COPY.labels.menu.openSettings, kind: "action" },
    { id: "quit", label: COPY.labels.menu.quit, kind: "action" },
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
      title: COPY.residentState.title,
      subtitle: COPY.residentState.subtitle,
      source: "system",
      metrics: metrics.map((metric) => ({ ...metric })),
    },
    media: {
      kind: "media",
      title: COPY.mediaState.title,
      subtitle: COPY.mediaState.subtitle,
      source: "mock",
      artist: COPY.mediaState.artist,
      timeLabel: COPY.mediaState.timeLabel,
      progress: 48,
      accent: "violet",
    },
    download: {
      kind: "download",
      title: COPY.downloadState.title,
      subtitle: COPY.downloadState.subtitle,
      source: "mock",
      detail: COPY.downloadState.detail,
      progress: 57,
      accent: "green",
    },
    update: {
      kind: "update",
      title: COPY.updateState.title,
      subtitle: COPY.updateState.subtitle,
      source: "mock",
      detail: COPY.updateState.detail,
      progress: 81,
      accent: "orange",
    },
    clipboard: {
      kind: "clipboard",
      title: COPY.clipboardState.title,
      subtitle: COPY.clipboardState.subtitle,
      source: "mock",
      copiedText: COPY.clipboardState.copiedText,
      detail: COPY.clipboardState.detail,
      accent: "blue",
    },
    focus: {
      kind: "focus",
      title: COPY.focusState.title,
      subtitle: COPY.focusState.subtitle,
      source: "mock",
      sessionLabel: COPY.focusState.sessionLabel,
      detail: COPY.focusState.detail,
      accent: "pink",
    },
  };
}

export function getDesktopStatusTemplateChromeCopy() {
  return COPY.templateChrome;
}

export function getDesktopStatusShellCopy() {
  return COPY.shell;
}

export function getDesktopStatusSettingsCopy() {
  return COPY.settings;
}
