import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { correctStatusWindowPosition } from "../../../runtime/statusWindowRuntime";
import { getTauriInvoke } from "../../../runtime/tauriRuntime";

const STATUS_WINDOW_DRAG_COMMAND = "start_window_drag";

export type UseDragControllerResult = {
  isDraggingRef: React.MutableRefObject<boolean>;
  lockPositionRef: React.MutableRefObject<boolean>;
  handlePointerDown: (event: ReactPointerEvent<HTMLElement>) => Promise<void>;
};

export function useDragController(): UseDragControllerResult {
  const isDraggingRef = useRef(false);
  const lockPositionRef = useRef(false);

  async function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (lockPositionRef.current || event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDraggingRef.current = true;

    const invoke = getTauriInvoke();
    if (!invoke) {
      isDraggingRef.current = false;
      return;
    }

    const started = await (async () => {
      try {
        await invoke(STATUS_WINDOW_DRAG_COMMAND);
        return true;
      } catch {
        return false;
      }
    })();

    if (!started) {
      isDraggingRef.current = false;
    }
  }

  useEffect(() => {
    function handlePointerUp() {
      if (!isDraggingRef.current) {
        return;
      }

      isDraggingRef.current = false;
      void correctStatusWindowPosition();
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, []);

  return { isDraggingRef, lockPositionRef, handlePointerDown };
}
