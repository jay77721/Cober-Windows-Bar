import { mockHubEvents } from "../data/mockHubData";
import type { HubEvent } from "../types/hub";
import {
  getTauriInvoke,
  loadTauriFixtureHubEvents,
  type TauriInvoke,
  type TauriRuntimeDiagnostic,
} from "./tauriRuntime";

export type DesktopStatusEventSource = "mock" | "tauri-fixture";

export type DesktopStatusEventsResult = {
  events: HubEvent[];
  source: DesktopStatusEventSource;
  diagnostic?: TauriRuntimeDiagnostic;
};

export async function loadDesktopStatusEvents({
  invoke = getTauriInvoke(),
  fallbackEvents = mockHubEvents,
}: {
  invoke?: TauriInvoke;
  fallbackEvents?: HubEvent[];
} = {}): Promise<DesktopStatusEventsResult> {
  if (!invoke) {
    return {
      events: snapshotHubEvents(fallbackEvents),
      source: "mock",
    };
  }

  const result = await loadTauriFixtureHubEvents({ invoke });

  if (!result.ok) {
    return {
      events: snapshotHubEvents(fallbackEvents),
      source: "mock",
      diagnostic: result.diagnostic,
    };
  }

  return {
    events: snapshotHubEvents(result.events),
    source: "tauri-fixture",
  };
}

function snapshotHubEvents(events: HubEvent[]): HubEvent[] {
  return events.map((event) => ({
    ...event,
    payload: event.payload ? { ...event.payload } : undefined,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  }));
}
