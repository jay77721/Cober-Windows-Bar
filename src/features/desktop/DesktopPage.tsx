import { useCallback, useEffect, useRef, useState } from "react";
import { getDesktopStatusShellCopy } from "../../data/desktopStatusConfig";
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
  useSettingsActions,
  useSystemPerformance,
  useWindowLifecycle,
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
  const { metrics, diagnostic, refreshMetrics } = useSystemPerformance();

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

  // Settings actions (preference toggles + menu forwarding)
  const {
    toggleAlwaysFloat,
    toggleAvoidFullscreen,
    toggleLockPosition,
    toggleFromMenu,
  } = useSettingsActions({
    preferences,
    updatePreferences,
    overlayStateRef,
    isDraggingRef,
  });

  // Window lifecycle (reset, quit, recall)
  const { resetPosition, quitStatusCenter, recallStatusCenter } = useWindowLifecycle({
    appWindowRef,
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
  }, [refreshMetrics, refreshRuntime, isDraggingRef]);

  const showNativeContextMenu = useCallback(async (x: number, y: number) => {
    const invoke = getTauriInvoke();
    if (!invoke || isDraggingRef.current) {
      return;
    }

    await invoke(STATUS_CENTER_CONTEXT_MENU_COMMAND, { x, y });
  }, [isDraggingRef]);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleKindSelect = useCallback((kind: DesktopStatusKind) => {
    setActiveStatusKind(kind);
    setPreferredUntil(Date.now() + preferredWindowMs);
  }, [preferredWindowMs, setActiveStatusKind, setPreferredUntil]);

  const toggleAutostart = useCallback(async () => {
    const nextValue = !autostartEnabled;
    const success = await applyAutostart(nextValue);
    if (success) {
      setAutostartEnabled(nextValue);
    }
  }, [autostartEnabled]);

  const handleMenuAction = useCallback(async (action: string, checked?: boolean) => {
    switch (action) {
      case "refresh-data":
        await refresh();
        return;
      case "toggle-always-float":
      case "toggle-avoid-fullscreen":
      case "toggle-lock-position":
        if (typeof checked === "boolean") {
          toggleFromMenu(action, checked);
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
  }, [refresh, toggleFromMenu, resetPosition, openSettings, quitStatusCenter]);

  const handleOpenSettingsClick = useCallback(async () => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      openSettings();
      return;
    }

    await invoke(OPEN_STATUS_CENTER_SETTINGS_COMMAND);
  }, [openSettings]);

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
