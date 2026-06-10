import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  correctStatusWindowPosition,
  correctStatusWindowPositionForDisplayChange,
  createDebouncedWindowCorrection,
  createStatusWindowOverlayState,
  enforceStatusWindowOverlay,
  scheduleOverlayStartupReassert,
  STATUS_WINDOW_DISPLAY_CHANGE_DEBOUNCE_MS,
  STATUS_WINDOW_SCALE_CHANGE_DEBOUNCE_MS,
  type StatusWindowOverlayState,
} from "../../../runtime/statusWindowRuntime";
import { getTauriInvoke } from "../../../runtime/tauriRuntime";

const OVERLAY_POLICY_MS = 700;

type TauriAppWindow = ReturnType<typeof getCurrentWindow>;

export type UseOverlayPolicyOptions = {
  avoidFullscreen: boolean;
  isDraggingRef: React.RefObject<boolean>;
};

export type UseOverlayPolicyResult = {
  overlayStateRef: React.RefObject<StatusWindowOverlayState>;
};

function getSafeCurrentWindow(): TauriAppWindow | undefined {
  try {
    return getCurrentWindow();
  } catch {
    return undefined;
  }
}

export function useOverlayPolicy({
  avoidFullscreen,
  isDraggingRef,
}: UseOverlayPolicyOptions): UseOverlayPolicyResult {
  const overlayStateRef = useRef(createStatusWindowOverlayState());
  const appWindowRef = useRef<TauriAppWindow | undefined>(getSafeCurrentWindow());

  // Overlay policy polling
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
  }, [isDraggingRef]);

  // Display change handling (move, resize, scale)
  useEffect(() => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    const appWindow = appWindowRef.current;
    if (!appWindow) {
      return;
    }

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
  }, [isDraggingRef]);

  return { overlayStateRef };
}
