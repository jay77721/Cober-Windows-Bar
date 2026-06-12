import { useCallback, useEffect, useRef, useState } from "react";
import { getDesktopStatusShellCopy } from "../../data/desktopStatusConfig";
import {
  correctStatusWindowPosition,
  scheduleOverlayStartupReassert,
  STATUS_WINDOW_CORRECT_POSITION_COMMAND,
} from "../../runtime/statusWindowRuntime";
import { emitTauriFixtureEvents, getTauriInvoke } from "../../runtime/tauriRuntime";
import { getAutostartEnabled, setAutostartEnabled as applyAutostart } from "../../runtime/autostartRuntime";
import { resolveDesktopStatusState } from "../../state/desktopStatusState";
import { getSafeCurrentWindow, type TauriAppWindow } from "../../shared/tauriWindow";
import type { DesktopStatusKind } from "../../types/hub";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  useContextMenu,
  useDesktopStatusRuntime,
  useDragController,
  useOverlayPolicy,
  usePreferences,
  useSystemPerformance,
} from "./hooks";
import { ClipboardStatusTemplate } from "./templates/ClipboardStatusTemplate";
import { DownloadStatusTemplate } from "./templates/DownloadStatusTemplate";
import { FocusStatusTemplate } from "./templates/FocusStatusTemplate";
import { MediaStatusTemplate } from "./templates/MediaStatusTemplate";
import { NotificationStatusTemplate } from "./templates/NotificationStatusTemplate";
import { ResidentStatusTemplate } from "./templates/ResidentStatusTemplate";
import { UpdateStatusTemplate } from "./templates/UpdateStatusTemplate";

const STATUS_CENTER_CONTEXT_MENU_COMMAND = "show_status_center_context_menu";
const OPEN_STATUS_CENTER_SETTINGS_COMMAND = "open_status_center_settings";
const SHOW_STATUS_CENTER_WINDOW_COMMAND = "show_status_center_window";

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
    case "notification":
      return <NotificationStatusTemplate state={state} />;
  }
}

export function DesktopPage() {
  const appWindowRef = useRef<TauriAppWindow | undefined>(getSafeCurrentWindow());
  const shellCopy = getDesktopStatusShellCopy();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);

  // Load initial autostart state
  useEffect(() => {
    void getAutostartEnabled().then(setAutostartEnabled);
  }, []);

  // Explicitly disable window shadow from the frontend (backup for Rust DWM calls)
  useEffect(() => {
    const win = appWindowRef.current;
    if (win) {
      void win.setShadow(false);
    }
  }, []);

  // Drag controller
  const { isDraggingRef, lockPositionRef, handlePointerDown } = useDragController();

  // System performance polling
  const { metrics, diagnostic, metricsRef, diagnosticRef, refreshMetrics } = useSystemPerformance();

  // Desktop status runtime + aggregation + state resolution
  // Unified Provider pipeline handles media, clipboard, focus, and system perf.
  const {
    resolvedState,
    activeStatusKind,
    preferredUntil,
    setActiveStatusKind,
    setPreferredUntil,
    refreshRuntime,
    preferredWindowMs,
  } = useDesktopStatusRuntime(metrics, diagnostic.quality);

  // Preferences
  const { preferences, updatePreferences } = usePreferences();

  // Sync lockPosition to drag controller ref.
  // This is a render-time ref write — it's safe because the drag controller
  // reads the ref lazily inside its event handler, not synchronously during
  // render. Doing it via useEffect would just push the write one frame later
  // and risk a window where the drag controller sees a stale value.
  lockPositionRef.current = preferences.lockPosition;

  // Overlay policy (fullscreen avoidance + floating)
  const { overlayStateRef } = useOverlayPolicy({
    avoidFullscreen: preferences.avoidFullscreen,
    isDraggingRef,
  });

  // Preferred kind timer expiry
  useEffect(() => {
    if (preferredUntil === undefined) {
      return;
    }

    if (preferredUntil <= Date.now()) {
      setPreferredUntil(undefined);
      setActiveStatusKind(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setPreferredUntil(undefined);
      setActiveStatusKind(null);
    }, Math.max(0, preferredUntil - Date.now()));

    return () => window.clearTimeout(timer);
  }, [preferredUntil, setPreferredUntil, setActiveStatusKind]);

  // -- Action handlers (useCallback to prevent unnecessary child re-renders) --

  const refresh = useCallback(async () => {
    if (isDraggingRef.current) {
      return;
    }

    const invoke = getTauriInvoke();
    if (invoke) {
      await emitTauriFixtureEvents({ invoke });
    }

    await Promise.all([refreshMetrics(), refreshRuntime()]);
  }, [refreshMetrics, refreshRuntime]);

  const showNativeContextMenu = useCallback(async (x: number, y: number) => {
    const invoke = getTauriInvoke();
    if (!invoke || isDraggingRef.current) {
      return;
    }

    await invoke(STATUS_CENTER_CONTEXT_MENU_COMMAND, { x, y });
  }, []);

  const resetPosition = useCallback(async () => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    await invoke(STATUS_WINDOW_CORRECT_POSITION_COMMAND);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleKindSelect = useCallback((kind: DesktopStatusKind) => {
    setActiveStatusKind(kind);
    setPreferredUntil(Date.now() + preferredWindowMs);
  }, [preferredWindowMs]);

  const toggleAlwaysFloat = useCallback(async () => {
    await updatePreferences({ alwaysFloat: !preferences.alwaysFloat });
  }, [preferences.alwaysFloat, updatePreferences]);

  const toggleAvoidFullscreen = useCallback(() => {
    void updatePreferences({ avoidFullscreen: !preferences.avoidFullscreen });
    scheduleOverlayStartupReassert(overlayStateRef.current);
  }, [preferences.avoidFullscreen, updatePreferences, overlayStateRef]);

  const toggleLockPosition = useCallback(() => {
    const nextValue = !preferences.lockPosition;
    void updatePreferences({ lockPosition: nextValue });

    if (nextValue) {
      isDraggingRef.current = false;
    }
  }, [preferences.lockPosition, updatePreferences]);

  const toggleAutostart = useCallback(async () => {
    const nextValue = !autostartEnabled;
    const success = await applyAutostart(nextValue);
    if (success) {
      setAutostartEnabled(nextValue);
    }
  }, [autostartEnabled]);

  const quitStatusCenter = useCallback(async () => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      await appWindowRef.current?.hide();
      return;
    }

    try {
      await invoke("quit_status_center");
    } catch {
      await appWindowRef.current?.hide();
    }
  }, []);

  const handleMenuAction = useCallback(async (action: string, checked?: boolean) => {
    switch (action) {
      case "refresh-data":
        await refresh();
        return;
      case "toggle-always-float":
        if (typeof checked === "boolean") {
          await updatePreferences({ alwaysFloat: checked });
        }
        return;
      case "toggle-avoid-fullscreen":
        if (typeof checked === "boolean") {
          void updatePreferences({ avoidFullscreen: checked });
          scheduleOverlayStartupReassert(overlayStateRef.current);
        }
        return;
      case "toggle-lock-position":
        if (typeof checked === "boolean") {
          void updatePreferences({ lockPosition: checked });
          if (checked) {
            isDraggingRef.current = false;
          }
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
  }, [refresh, updatePreferences, overlayStateRef, resetPosition, openSettings, quitStatusCenter]);

  const handleOpenSettingsClick = useCallback(async () => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      openSettings();
      return;
    }

    await invoke(OPEN_STATUS_CENTER_SETTINGS_COMMAND);
  }, [openSettings]);

  const recallStatusCenter = useCallback(async () => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      await appWindowRef.current?.show();
      await appWindowRef.current?.setFocus();
      return;
    }

    await invoke(SHOW_STATUS_CENTER_WINDOW_COMMAND);
  }, []);

  // Global context menu + Escape key
  useContextMenu({ settingsOpen, closeSettings, showNativeContextMenu });

  return (
    <main
      className="product-status-window"
      data-testid="desktop-preview"
      onPointerDownCapture={handlePointerDown}
    >
      <section className="product-status-center" aria-label={shellCopy.ariaLabel}>
        {renderDesktopStatusTemplate(resolvedState)}
      </section>

      {settingsOpen ? (
        <SettingsPanel
          preferences={preferences}
          activeStatusKind={activeStatusKind}
          autostartEnabled={autostartEnabled}
          onToggleAlwaysFloat={toggleAlwaysFloat}
          onToggleAvoidFullscreen={toggleAvoidFullscreen}
          onToggleLockPosition={toggleLockPosition}
          onToggleAutostart={toggleAutostart}
          onKindSelect={handleKindSelect}
          onRefresh={refresh}
          onResetPosition={resetPosition}
          onOpenNativeSettings={handleOpenSettingsClick}
          onRecallStatusCenter={recallStatusCenter}
          onClose={closeSettings}
        />
      ) : null}
    </main>
  );
}
