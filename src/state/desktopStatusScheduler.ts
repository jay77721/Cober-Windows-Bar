import { DESKTOP_STATUS_PRIORITY_ORDER } from "../data/desktopStatusConfig";
import { dedupeKindsOrEmpty } from "../shared/runtimeGuards";
import type {
  DesktopStatusKind,
  DesktopStatusScheduleDecision,
  DesktopStatusSchedulerInput,
} from "../types/hub";

export const DESKTOP_STATUS_FALLBACK_KIND: DesktopStatusKind = "resident";
export const DESKTOP_STATUS_STABILITY_WINDOW_MS = 6_000;
export const DESKTOP_STATUS_PREFERRED_WINDOW_MS = 20_000;
export const DESKTOP_STATUS_PREEMPTION_WINDOW_MS = 12_000;

function isWithinWindow(timestamp: number | undefined, now: number, durationMs: number): boolean {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp <= now && now - timestamp <= durationMs;
}

function filterKnownKinds(kinds: DesktopStatusKind[] | undefined): DesktopStatusKind[] {
  if (!kinds?.length) {
    return [];
  }

  return kinds.filter((kind) => DESKTOP_STATUS_PRIORITY_ORDER.includes(kind));
}

export function getDesktopStatusPriorityOrder(): DesktopStatusKind[] {
  return [...DESKTOP_STATUS_PRIORITY_ORDER];
}

export function scheduleDesktopStatus(input: DesktopStatusSchedulerInput): DesktopStatusScheduleDecision {
  const now = typeof input.now === "number" && Number.isFinite(input.now) ? input.now : 0;
  const availableKinds = filterKnownKinds(dedupeKindsOrEmpty(input.availableKinds));
  const preferredKind = input.preferredKind;
  const previousKind = input.previousKind;
  const activeKinds = filterKnownKinds(dedupeKindsOrEmpty(input.activeKinds));
  const activeAvailableKinds = activeKinds.filter((kind) => availableKinds.includes(kind));
  const preferredStillPinned =
    preferredKind &&
    availableKinds.includes(preferredKind) &&
    isWithinWindow(input.preferredUntil, now, DESKTOP_STATUS_PREFERRED_WINDOW_MS * 4);

  if (preferredKind && availableKinds.includes(preferredKind) && preferredStillPinned) {
    return {
      kind: preferredKind,
      reason: "preferred",
      changed: preferredKind !== previousKind,
    };
  }

  const previousStillStable =
    previousKind &&
    activeAvailableKinds.includes(previousKind) &&
    isWithinWindow(input.previousChangedAt, now, DESKTOP_STATUS_STABILITY_WINDOW_MS);

  if (previousStillStable) {
    const previousPriority = DESKTOP_STATUS_PRIORITY_ORDER.indexOf(previousKind);
    const canPreemptPrevious = activeAvailableKinds.some((kind) => {
      const priority = DESKTOP_STATUS_PRIORITY_ORDER.indexOf(kind);
      const activatedAt = input.activatedAtByKind?.[kind];
      return (
        priority !== -1 &&
        priority < previousPriority &&
        isWithinWindow(activatedAt, now, DESKTOP_STATUS_PREEMPTION_WINDOW_MS)
      );
    });

    if (!canPreemptPrevious) {
      return {
        kind: previousKind,
        reason: "priority",
        changed: false,
      };
    }
  }

  for (const kind of DESKTOP_STATUS_PRIORITY_ORDER) {
    if (activeAvailableKinds.includes(kind)) {
      return {
        kind,
        reason: "priority",
        changed: kind !== previousKind,
      };
    }
  }

  if (availableKinds.includes(DESKTOP_STATUS_FALLBACK_KIND)) {
    return {
      kind: DESKTOP_STATUS_FALLBACK_KIND,
      reason: "fallback",
      changed: DESKTOP_STATUS_FALLBACK_KIND !== previousKind,
    };
  }

  const firstKnownAvailableKind = availableKinds[0];
  if (firstKnownAvailableKind) {
    return {
      kind: firstKnownAvailableKind,
      reason: "fallback",
      changed: firstKnownAvailableKind !== previousKind,
    };
  }

  return {
    kind: DESKTOP_STATUS_FALLBACK_KIND,
    reason: "fallback",
    changed: DESKTOP_STATUS_FALLBACK_KIND !== previousKind,
  };
}
