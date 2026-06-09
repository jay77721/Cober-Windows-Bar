import { listen, type Event, type UnlistenFn } from "@tauri-apps/api/event";

export const STATUS_CENTER_MENU_ACTION_EVENT = "status-center://menu-action";

export type StatusCenterMenuAction =
  | "refresh-data"
  | "toggle-always-float"
  | "toggle-avoid-fullscreen"
  | "toggle-lock-position"
  | "reset-position"
  | "open-settings"
  | "quit";

export type StatusCenterMenuActionPayload = {
  action: StatusCenterMenuAction;
  checked?: boolean;
};

export function parseStatusCenterMenuActionPayload(
  value: unknown,
): StatusCenterMenuActionPayload | undefined {
  if (!isRecord(value) || !isStatusCenterMenuAction(value.action)) {
    return undefined;
  }

  return {
    action: value.action,
    checked: typeof value.checked === "boolean" ? value.checked : undefined,
  };
}

export async function listenStatusCenterMenuActions(
  handler: (payload: StatusCenterMenuActionPayload, event: Event<unknown>) => void | Promise<void>,
): Promise<UnlistenFn> {
  return listen(STATUS_CENTER_MENU_ACTION_EVENT, async (event) => {
    const payload = parseStatusCenterMenuActionPayload(event.payload);
    if (!payload) {
      return;
    }

    await handler(payload, event);
  });
}

function isStatusCenterMenuAction(value: unknown): value is StatusCenterMenuAction {
  return (
    value === "refresh-data" ||
    value === "toggle-always-float" ||
    value === "toggle-avoid-fullscreen" ||
    value === "toggle-lock-position" ||
    value === "reset-position" ||
    value === "open-settings" ||
    value === "quit"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
