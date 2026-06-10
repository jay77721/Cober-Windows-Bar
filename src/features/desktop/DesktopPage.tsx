import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getDesktopStatusShellCopy } from "../../data/desktopStatusConfig";
import {
  correctStatusWindowPosition,
  scheduleOverlayStartupReassert,
  STATUS_WINDOW_CORRECT_POSITION_COMMAND,
} from "../../runtime/statusWindowRuntime";
import { emitTauriFixtureEvents, getTauriInvoke } from "../../runtime/tauriRuntime";
import { resolveDesktopStatusState } from "../../state/desktopStatusState";
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
import { ResidentStatusTemplate } from "./templates/ResidentStatusTemplate";
import { UpdateStatusTemplate } from "./templates/UpdateStatusTemplate";

const STATUS_CENTER_CONTEXT_MENU_COMMAND = "show_status_center_context_menu";
const OPEN_STATUS_CENTER_SETTINGS_COMMAND = "open_status_center_settings";
const SHOW_STATUS_CENTER_WINDOW_COMMAND = "show_status_center_window";

type TauriAppWindow = ReturnType<typeof getCurrentWindow>;

function getSafeCurrentWindow(): TauriAppWindow | undefined {
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
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

export function DesktopPage() {
  const appWindowRef = useRef<TauriAppWindow | undefined>(getSafeCurrentWindow());
  const shellCopy = getDesktopStatusShellCopy();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag controller
  const { isDraggingRef, lockPositionRef, handlePointerDown } = useDragController();

  // System performance polling
  const { metrics, diagnostic, metricsRef, diagnosticRef, refreshMetrics } = useSystemPerformance();

  // Desktop status runtime + aggregation + state resolution
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

  // Sync lockPosition to drag controller ref
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

  // -- Action handlers --

  async function refresh() {
    if (isDraggingRef.current) {
      return;
    }

    const invoke = getTauriInvoke();
    if (invoke) {
      await emitTauriFixtureEvents({ invoke });
    }

    await Promise.all([refreshMetrics(), refreshRuntime()]);
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

  function openSettings() {
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  function handleKindSelect(kind: DesktopStatusKind) {
    setActiveStatusKind(kind);
    setPreferredUntil(Date.now() + preferredWindowMs);
  }

  async function toggleAlwaysFloat() {
    await updatePreferences({ alwaysFloat: !preferences.alwaysFloat });
  }

  function toggleAvoidFullscreen() {
    void updatePreferences({ avoidFullscreen: !preferences.avoidFullscreen });
    scheduleOverlayStartupReassert(overlayStateRef.current);
  }

  function toggleLockPosition() {
    const nextValue = !preferences.lockPosition;
    void updatePreferences({ lockPosition: nextValue });

    if (nextValue) {
      isDraggingRef.current = false;
    }
  }

  async function quitStatusCenter() {
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
  }

  async function handleMenuAction(action: string, checked?: boolean) {
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
      await appWindowRef.current?.show();
      await appWindowRef.current?.setFocus();
      return;
    }

    await invoke(SHOW_STATUS_CENTER_WINDOW_COMMAND);
  }

  async function handleContextMenu(event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    await showNativeContextMenu(event.clientX, event.clientY);
  }

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
          onToggleAlwaysFloat={() => void toggleAlwaysFloat()}
          onToggleAvoidFullscreen={toggleAvoidFullscreen}
          onToggleLockPosition={toggleLockPosition}
          onKindSelect={handleKindSelect}
          onRefresh={() => void refresh()}
          onResetPosition={() => void resetPosition()}
          onOpenNativeSettings={() => void handleOpenSettingsClick()}
          onRecallStatusCenter={() => void recallStatusCenter()}
          onClose={closeSettings}
        />
      ) : null}
    </main>
  );
}
