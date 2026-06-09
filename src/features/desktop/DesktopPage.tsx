import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MonitorCog, X } from "lucide-react";
import { DESKTOP_STATUS_TEMPLATE_DESCRIPTORS } from "../../data/desktopStatusConfig";
import { systemPerformanceMetrics } from "../../data/mockHubData";
import {
  listenStatusCenterMenuActions,
  listenStatusCenterOpenSettings,
  listenStatusCenterSettings,
  type StatusCenterMenuAction,
} from "../../runtime/desktopProductRuntime";
import {
  getDesktopStatusRuntime,
  type DesktopStatusRuntimeSnapshot,
} from "../../runtime/desktopStatusInputRuntime";
import {
  captureStatusWindowDragState,
  correctStatusWindowPosition,
  correctStatusWindowPositionForDisplayChange,
  createDebouncedWindowCorrection,
  createStatusWindowOverlayState,
  enforceStatusWindowOverlay,
  moveStatusWindowDrag,
  scheduleOverlayStartupReassert,
  STATUS_WINDOW_CORRECT_POSITION_COMMAND,
  STATUS_WINDOW_DISPLAY_CHANGE_DEBOUNCE_MS,
  STATUS_WINDOW_FLOATING_COMMAND,
  STATUS_WINDOW_SCALE_CHANGE_DEBOUNCE_MS,
  type StatusWindowDragState,
} from "../../runtime/statusWindowRuntime";
import { loadSystemPerformance } from "../../runtime/systemPerformanceRuntime";
import { getTauriInvoke } from "../../runtime/tauriRuntime";
import { aggregateDesktopStatusInput } from "../../state/desktopStatusAggregation";
import { resolveDesktopStatusState } from "../../state/desktopStatusState";
import type {
  DesktopStatusKind,
  DesktopStatusPreferences,
  DesktopStatusPreferencesPayload,
  HubStoreState,
  SystemPerformanceMetric,
} from "../../types/hub";
import { ClipboardStatusTemplate } from "./templates/ClipboardStatusTemplate";
import { DownloadStatusTemplate } from "./templates/DownloadStatusTemplate";
import { FocusStatusTemplate } from "./templates/FocusStatusTemplate";
import { MediaStatusTemplate } from "./templates/MediaStatusTemplate";
import { ResidentStatusTemplate } from "./templates/ResidentStatusTemplate";
import { UpdateStatusTemplate } from "./templates/UpdateStatusTemplate";

const STATUS_REFRESH_MS = 1800;
const OVERLAY_POLICY_MS = 700;
const STATUS_CENTER_CONTEXT_MENU_COMMAND = "show_status_center_context_menu";
const STATUS_CENTER_SETTINGS_COMMAND = "get_status_center_settings";
const OPEN_STATUS_CENTER_SETTINGS_COMMAND = "open_status_center_settings";
const SET_STATUS_CENTER_PREFERENCES_COMMAND = "set_status_center_preferences";
const SHOW_STATUS_CENTER_WINDOW_COMMAND = "show_status_center_window";

const DEFAULT_PREFERENCES: DesktopStatusPreferences = {
  alwaysFloat: true,
  avoidFullscreen: true,
  lockPosition: false,
};

type DragPointer = {
  x: number;
  y: number;
};

export function DesktopPage() {
  const desktopStatusRuntime = getDesktopStatusRuntime();
  const initialDesktopStatusSnapshot = desktopStatusRuntime.getSnapshot();
  const [metrics, setMetrics] = useState<SystemPerformanceMetric[]>(systemPerformanceMetrics);
  const [preferences, setPreferences] = useState<DesktopStatusPreferences>(DEFAULT_PREFERENCES);
  const [activeStatusKind, setActiveStatusKind] = useState<DesktopStatusKind | null>(null);
  const [desktopHubState, setDesktopHubState] = useState<HubStoreState>(initialDesktopStatusSnapshot.state);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dragStateRef = useRef<StatusWindowDragState | null>(null);
  const dragPointerRef = useRef<DragPointer | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dragMoveInFlightRef = useRef(false);
  const pendingPositionCorrectionRef = useRef(false);
  const isDraggingRef = useRef(false);
  const overlayStateRef = useRef(createStatusWindowOverlayState());
  const appWindowRef = useRef(getCurrentWindow());
  const desktopStatusRuntimeRef = useRef(desktopStatusRuntime);

  const aggregatedStatus = aggregateDesktopStatusInput({
    hubState: desktopHubState,
    availableKinds: DESKTOP_STATUS_TEMPLATE_DESCRIPTORS.map((descriptor) => descriptor.kind),
  });

  const resolvedState = resolveDesktopStatusState({
    metrics,
    activeKinds: aggregatedStatus.activeKinds,
    availableKinds: aggregatedStatus.availableKinds,
    states: aggregatedStatus.states,
    preferredKind: activeStatusKind ?? undefined,
  });

  async function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (preferences.lockPosition || event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDraggingRef.current = true;
    pendingPositionCorrectionRef.current = false;
    dragPointerRef.current = { x: event.screenX, y: event.screenY };

    const nextDragState = await captureStatusWindowDragState(event.screenX, event.screenY);
    dragStateRef.current = nextDragState;

    if (!nextDragState) {
      isDraggingRef.current = false;
      dragPointerRef.current = null;
    }
  }

  async function refresh() {
    if (isDraggingRef.current) {
      return;
    }

    const [nextMetrics, nextDesktopStatusSnapshot] = await Promise.all([
      loadSystemPerformance(),
      desktopStatusRuntimeRef.current.refresh(),
    ]);
    setMetrics(nextMetrics);
    applyDesktopStatusSnapshot(nextDesktopStatusSnapshot, setDesktopHubState);
  }

  async function showNativeContextMenu(x: number, y: number) {
    const invoke = getTauriInvoke();
    if (!invoke || isDraggingRef.current) {
      return;
    }

    await invoke(STATUS_CENTER_CONTEXT_MENU_COMMAND, { x, y });
  }

  async function resetPosition() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    await invoke(STATUS_WINDOW_CORRECT_POSITION_COMMAND);
  }

  async function updatePreferences(nextPreferences: Partial<DesktopStatusPreferences>) {
    const nextValue = { ...preferences, ...nextPreferences };
    const invoke = getTauriInvoke();

    setPreferences(nextValue);

    if (!invoke) {
      return;
    }

    await invoke(SET_STATUS_CENTER_PREFERENCES_COMMAND, {
      preferences: nextValue,
    });

    if (typeof nextPreferences.alwaysFloat === "boolean") {
      await invoke(STATUS_WINDOW_FLOATING_COMMAND, {
        floating: nextValue.alwaysFloat,
      });
    }
  }

  async function setAlwaysFloat(nextValue: boolean) {
    await updatePreferences({ alwaysFloat: nextValue });
  }

  function setAvoidFullscreen(nextValue: boolean) {
    void updatePreferences({ avoidFullscreen: nextValue });
    scheduleOverlayStartupReassert(overlayStateRef.current);
  }

  function setLockPosition(nextValue: boolean) {
    void updatePreferences({ lockPosition: nextValue });

    if (nextValue) {
      isDraggingRef.current = false;
      dragStateRef.current = null;
      dragPointerRef.current = null;
    }
  }

  async function quitStatusCenter() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      await appWindowRef.current.hide();
      return;
    }

    await appWindowRef.current.hide();
  }

  function openSettings() {
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  async function handleMenuAction(action: StatusCenterMenuAction, checked?: boolean) {
    switch (action) {
      case "refresh-data":
        await refresh();
        return;
      case "toggle-always-float":
        if (typeof checked === "boolean") {
          await setAlwaysFloat(checked);
        }
        return;
      case "toggle-avoid-fullscreen":
        if (typeof checked === "boolean") {
          setAvoidFullscreen(checked);
        }
        return;
      case "toggle-lock-position":
        if (typeof checked === "boolean") {
          setLockPosition(checked);
        }
        return;
      case "reset-position":
        await resetPosition();
        return;
      case "open-settings":
        openSettings();
        return;
      case "quit":
        await quitStatusCenter();
        return;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function refreshMetrics() {
      if (isDraggingRef.current) {
        return;
      }

      const nextMetrics = await loadSystemPerformance();
      if (mounted) {
        setMetrics(nextMetrics);
      }
    }

    void refreshMetrics();
    const timer = window.setInterval(() => {
      void refreshMetrics();
    }, STATUS_REFRESH_MS);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const runtime = desktopStatusRuntimeRef.current;
    const unsubscribe = runtime.subscribe((snapshot) => {
      applyDesktopStatusSnapshot(snapshot, setDesktopHubState);
    });

    void runtime.refresh().then((snapshot) => {
      applyDesktopStatusSnapshot(snapshot, setDesktopHubState);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    scheduleOverlayStartupReassert(overlayStateRef.current);

    async function updateOverlayPolicy() {
      if (isDraggingRef.current) {
        return;
      }

      try {
        await enforceStatusWindowOverlay(overlayStateRef.current, { invoke });
      } catch {
        // Keep the last known floating state if foreground-window detection is unavailable.
      }
    }

    void updateOverlayPolicy();
    const timer = window.setInterval(() => {
      void updateOverlayPolicy();
    }, OVERLAY_POLICY_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    const appWindow = appWindowRef.current;
    const scaleCorrection = createDebouncedWindowCorrection(async () => {
      if (isDraggingRef.current) {
        return;
      }

      scheduleOverlayStartupReassert(overlayStateRef.current);
      await correctStatusWindowPosition(invoke);
    }, STATUS_WINDOW_SCALE_CHANGE_DEBOUNCE_MS);
    const displayCorrection = createDebouncedWindowCorrection(async () => {
      if (isDraggingRef.current) {
        return;
      }

      scheduleOverlayStartupReassert(overlayStateRef.current);
      await correctStatusWindowPositionForDisplayChange(invoke);
    }, STATUS_WINDOW_DISPLAY_CHANGE_DEBOUNCE_MS);

    let disposed = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const [offMoved, offResized, offScaleChanged] = await Promise.all([
        appWindow.onMoved(() => {
          displayCorrection.trigger();
        }),
        appWindow.onResized(() => {
          displayCorrection.trigger();
        }),
        appWindow.onScaleChanged(() => {
          scaleCorrection.trigger();
        }),
      ]);

      if (disposed) {
        await Promise.all([offMoved(), offResized(), offScaleChanged()]);
        return;
      }

      cleanups.push(offMoved, offResized, offScaleChanged);
    })();

    return () => {
      disposed = true;
      scaleCorrection.cancel();
      displayCorrection.cancel();
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, []);

  useEffect(() => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    let disposed = false;
    let offMenuActions: (() => void) | undefined;
    let offSettings: (() => void) | undefined;
    let offOpenSettings: (() => void) | undefined;

    function applySettings(payload: DesktopStatusPreferencesPayload) {
      if (disposed) {
        return;
      }

      setPreferences({ ...payload.preferences });
    }

    void (async () => {
      const settingsResult = await invoke(STATUS_CENTER_SETTINGS_COMMAND);
      if (!disposed && isPreferencesPayload(settingsResult)) {
        setPreferences({ ...settingsResult.preferences });
      }

      offMenuActions = await listenStatusCenterMenuActions(async ({ action, checked }) => {
        await handleMenuAction(action, checked);
      });

      offSettings = await listenStatusCenterSettings((payload) => {
        applySettings(payload);
      });

      offOpenSettings = await listenStatusCenterOpenSettings(() => {
        openSettings();
      });
    })();

    return () => {
      disposed = true;
      offMenuActions?.();
      offSettings?.();
      offOpenSettings?.();
    };
  }, []);

  useEffect(() => {
    function clearPendingDragFrame() {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    }

    function scheduleDragMove() {
      if (dragFrameRef.current !== null) {
        return;
      }

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;

        const dragState = dragStateRef.current;
        const pointer = dragPointerRef.current;
        if (!dragState || !pointer || dragMoveInFlightRef.current) {
          return;
        }

        const { x, y } = pointer;
        dragMoveInFlightRef.current = true;

        void moveStatusWindowDrag(dragState, x, y)
          .catch(() => {
            dragStateRef.current = null;
            dragPointerRef.current = null;
            isDraggingRef.current = false;
            pendingPositionCorrectionRef.current = false;
          })
          .finally(() => {
            dragMoveInFlightRef.current = false;

            if (pendingPositionCorrectionRef.current && !isDraggingRef.current) {
              pendingPositionCorrectionRef.current = false;
              void correctStatusWindowPosition();
              return;
            }

            const latestPointer = dragPointerRef.current;
            if (
              dragStateRef.current &&
              latestPointer &&
              (latestPointer.x !== x || latestPointer.y !== y)
            ) {
              scheduleDragMove();
            }
          });
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDraggingRef.current) {
        return;
      }

      dragPointerRef.current = { x: event.screenX, y: event.screenY };
      scheduleDragMove();
    }

    function handlePointerUp() {
      const wasDragging = isDraggingRef.current || dragStateRef.current !== null;

      clearPendingDragFrame();
      isDraggingRef.current = false;
      dragStateRef.current = null;
      dragPointerRef.current = null;

      if (wasDragging) {
        if (dragMoveInFlightRef.current) {
          pendingPositionCorrectionRef.current = true;
          return;
        }

        void correctStatusWindowPosition();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      clearPendingDragFrame();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, []);

  async function handleContextMenu(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    await showNativeContextMenu(event.clientX, event.clientY);
  }

  async function handleOpenSettingsClick() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      openSettings();
      return;
    }

    await invoke(OPEN_STATUS_CENTER_SETTINGS_COMMAND);
  }

  async function recallStatusCenter() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      await appWindowRef.current.show();
      await appWindowRef.current.setFocus();
      return;
    }

    await invoke(SHOW_STATUS_CENTER_WINDOW_COMMAND);
  }

  return (
    <main
      className="product-status-window"
      data-testid="desktop-preview"
      onContextMenu={handleContextMenu}
      onPointerDownCapture={handlePointerDown}
    >
      <section className="product-status-center" aria-label="Cober system performance status center">
        {renderDesktopStatusTemplate(resolvedState)}
      </section>

      {settingsOpen ? (
        <section className="product-status-settings" aria-label="状态中心设置">
          <header className="product-status-settings-header">
            <div className="product-status-settings-title">
              <div className="product-status-settings-icon" aria-hidden="true">
                <MonitorCog size={18} strokeWidth={2.1} />
              </div>
              <div>
                <strong>状态中心设置</strong>
                <span>桌面能力与状态模板入口</span>
              </div>
            </div>
            <button
              className="product-status-settings-close"
              type="button"
              aria-label="关闭设置"
              onClick={closeSettings}
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </header>

          <div className="product-status-settings-body">
            <div className="product-status-settings-section">
              <span className="product-status-settings-label">窗口行为</span>
              <div className="product-status-settings-grid">
                <button
                  type="button"
                  className={settingsToggleClassName(preferences.alwaysFloat)}
                  onClick={() => void setAlwaysFloat(!preferences.alwaysFloat)}
                >
                  <strong>总是悬浮</strong>
                  <span>{preferences.alwaysFloat ? "已开启" : "已关闭"}</span>
                </button>
                <button
                  type="button"
                  className={settingsToggleClassName(preferences.avoidFullscreen)}
                  onClick={() => setAvoidFullscreen(!preferences.avoidFullscreen)}
                >
                  <strong>全屏时避让</strong>
                  <span>{preferences.avoidFullscreen ? "已开启" : "已关闭"}</span>
                </button>
                <button
                  type="button"
                  className={settingsToggleClassName(preferences.lockPosition)}
                  onClick={() => setLockPosition(!preferences.lockPosition)}
                >
                  <strong>锁定位置</strong>
                  <span>{preferences.lockPosition ? "已开启" : "已关闭"}</span>
                </button>
              </div>
            </div>

            <div className="product-status-settings-section">
              <span className="product-status-settings-label">状态模板</span>
              <div className="product-status-settings-kinds">
                {DESKTOP_STATUS_TEMPLATE_DESCRIPTORS.map((descriptor) => {
                  const active = descriptor.kind === activeStatusKind;

                  return (
                    <button
                      key={descriptor.kind}
                      type="button"
                      className={active ? "product-status-kind is-active" : "product-status-kind"}
                      onClick={() => setActiveStatusKind(descriptor.kind)}
                    >
                      <strong>{descriptor.label}</strong>
                      <span>{descriptor.description}</span>
                      <small>{descriptor.providerHint}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="product-status-settings-actions">
              <button type="button" className="product-status-settings-action" onClick={() => void refresh()}>
                刷新数据
              </button>
              <button type="button" className="product-status-settings-action" onClick={() => void resetPosition()}>
                重置位置
              </button>
              <button
                type="button"
                className="product-status-settings-action is-primary"
                onClick={() => void handleOpenSettingsClick()}
              >
                触发原生设置入口
              </button>
              <button
                type="button"
                className="product-status-settings-action"
                onClick={() => void recallStatusCenter()}
              >
                召回状态中心
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function isPreferencesPayload(value: unknown): value is DesktopStatusPreferencesPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const preferences = (value as DesktopStatusPreferencesPayload).preferences;

  return (
    typeof preferences?.alwaysFloat === "boolean" &&
    typeof preferences.avoidFullscreen === "boolean" &&
    typeof preferences.lockPosition === "boolean"
  );
}

function applyDesktopStatusSnapshot(
  snapshot: DesktopStatusRuntimeSnapshot,
  setDesktopHubState: (state: HubStoreState) => void,
) {
  setDesktopHubState(snapshot.state);
}

function renderDesktopStatusTemplate(state: ReturnType<typeof resolveDesktopStatusState>) {
  switch (state.kind) {
    case "resident":
      return <ResidentStatusTemplate state={state} />;
    case "media":
      return <MediaStatusTemplate state={state} />;
    case "download":
      return <DownloadStatusTemplate state={state} />;
    case "update":
      return <UpdateStatusTemplate state={state} />;
    case "clipboard":
      return <ClipboardStatusTemplate state={state} />;
    case "focus":
      return <FocusStatusTemplate state={state} />;
  }
}

function settingsToggleClassName(active: boolean) {
  return active ? "product-status-toggle is-active" : "product-status-toggle";
}
