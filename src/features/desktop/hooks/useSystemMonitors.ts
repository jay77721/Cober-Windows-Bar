import { useEffect, useState } from "react";
import {
  getFocusAssistState,
  onFocusAssistChanged,
  onNotificationsChanged,
  type FocusAssistState,
  type NotificationSummary,
} from "../../../runtime/systemMonitorRuntime";
import type {
  DesktopFocusState,
  DesktopStatusKind,
  DesktopStatusStateMap,
  GuestProviderSourceHealth,
} from "../../../types/hub";

export type SystemMonitorResult = {
  externalActiveKinds: DesktopStatusKind[];
  externalStates: Partial<DesktopStatusStateMap>;
  focusAssistState: FocusAssistState | undefined;
  notificationSummary: NotificationSummary | undefined;
  sourceHealth: GuestProviderSourceHealth | undefined;
};

function buildFocusState(focus: FocusAssistState): DesktopFocusState {
  const profileLabel = focus.profile
    ? focus.profile.replace("Microsoft.Windows.Focus_", "")
    : "";

  return {
    kind: "focus",
    title: "专注模式",
    subtitle: "系统状态",
    source: "system",
    sessionLabel: profileLabel
      ? `${profileLabel} 模式已启用`
      : "专注助手已启用",
    detail: "暂不打扰",
    accent: "pink",
    sourceHealth: {
      kind: "focus",
      quality: "native",
      code: "available",
      safeToDisplay: true,
      lastCheckedAt: focus.checkedAt,
    },
  };
}

export function useSystemMonitors(): SystemMonitorResult {
  const [focusState, setFocusState] = useState<FocusAssistState | undefined>(undefined);
  const [notifSummary, setNotifSummary] = useState<NotificationSummary | undefined>(undefined);

  // Load initial focus assist state
  useEffect(() => {
    void getFocusAssistState().then((state) => {
      if (state) {
        setFocusState(state);
      }
    });
  }, []);

  // Subscribe to focus assist changes
  useEffect(() => {
    let unsub: (() => void) | undefined;

    void onFocusAssistChanged((state) => {
      setFocusState(state);
    }).then((unlisten) => {
      unsub = unlisten;
    });

    return () => {
      unsub?.();
    };
  }, []);

  // Subscribe to notification changes
  useEffect(() => {
    let unsub: (() => void) | undefined;

    void onNotificationsChanged((summary) => {
      setNotifSummary(summary);
    }).then((unlisten) => {
      unsub = unlisten;
    });

    return () => {
      unsub?.();
    };
  }, []);

  // Derive external active kinds and states
  const externalActiveKinds: DesktopStatusKind[] = [];
  const externalStates: Partial<DesktopStatusStateMap> = {};
  let sourceHealth: GuestProviderSourceHealth | undefined;

  if (focusState?.active) {
    externalActiveKinds.push("focus");
    externalStates.focus = buildFocusState(focusState);
    sourceHealth = {
      kind: "focus",
      quality: "native",
      code: "available",
      safeToDisplay: true,
      lastCheckedAt: focusState.checkedAt,
    };
  }

  return {
    externalActiveKinds,
    externalStates,
    focusAssistState: focusState,
    notificationSummary: notifSummary,
    sourceHealth,
  };
}
