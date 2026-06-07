import type { HubEvent, HubEventSource, HubEventType } from "../types/hub";

export const TAURI_FIXTURE_COMMAND = "get_hub_event_fixtures";

export type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export type TauriRuntimeDiagnosticCode = "unavailable" | "invoke-failed" | "malformed";

export type TauriRuntimeDiagnostic = {
  code: TauriRuntimeDiagnosticCode;
  message: string;
  detail?: string;
};

export type TauriRuntimeResult =
  | {
      ok: true;
      events: HubEvent[];
    }
  | {
      ok: false;
      diagnostic: TauriRuntimeDiagnostic;
    };

export type HubEventPublisher = {
  publishHubEvent(event: HubEvent): void;
};

type TauriGlobal = {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
    invoke?: TauriInvoke;
  };
};

const eventTypes = new Set<HubEventType>(["music", "ai", "download", "notification"]);
const eventSources = new Set<HubEventSource>([
  "mock",
  "system",
  "music",
  "download",
  "ai",
  "notification",
]);

export function getTauriInvoke(globalScope: unknown = globalThis): TauriInvoke | undefined {
  const tauri = (globalScope as TauriGlobal | undefined)?.__TAURI__;
  const invoke = tauri?.core?.invoke ?? tauri?.invoke;

  return typeof invoke === "function" ? invoke : undefined;
}

export async function loadTauriFixtureHubEvents({
  invoke = getTauriInvoke(),
}: {
  invoke?: TauriInvoke;
} = {}): Promise<TauriRuntimeResult> {
  if (!invoke) {
    return {
      ok: false,
      diagnostic: {
        code: "unavailable",
        message: "Tauri runtime invoke is unavailable.",
      },
    };
  }

  try {
    const value = await invoke(TAURI_FIXTURE_COMMAND);
    const events = parseHubEvents(value);

    if (!events) {
      return {
        ok: false,
        diagnostic: {
          code: "malformed",
          message: "Tauri runtime returned malformed HubEvent fixtures.",
        },
      };
    }

    return {
      ok: true,
      events,
    };
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code: "invoke-failed",
        message: "Tauri runtime fixture command failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function publishTauriFixtureEvents(
  eventBus: HubEventPublisher,
  options: {
    invoke?: TauriInvoke;
  } = {},
): Promise<TauriRuntimeResult> {
  const result = await loadTauriFixtureHubEvents(options);

  if (!result.ok) {
    return result;
  }

  result.events.forEach((event) => eventBus.publishHubEvent(event));

  return result;
}

function parseHubEvents(value: unknown): HubEvent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const events = value.filter(isHubEvent);

  return events.length === value.length ? events : undefined;
}

function isHubEvent(value: unknown): value is HubEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    eventTypes.has(value.type as HubEventType) &&
    eventSources.has(value.source as HubEventSource) &&
    typeof value.createdAt === "number" &&
    isOptionalNumber(value.expiresAt) &&
    isOptionalNumber(value.progress) &&
    isOptionalRecord(value.payload) &&
    isOptionalRecord(value.metadata)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalRecord(value: unknown): boolean {
  return value === undefined || isRecord(value);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}
