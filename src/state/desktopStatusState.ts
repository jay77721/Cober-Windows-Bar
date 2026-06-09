import { DESKTOP_STATUS_TEMPLATE_ORDER, createDesktopStatusStateTemplates } from "../data/desktopStatusConfig";
import type {
  DesktopStatusKind,
  DesktopStatusResolverInput,
  DesktopStatusState,
  DesktopStatusStateMap,
  SystemPerformanceMetric,
} from "../types/hub";

export const DESKTOP_STATUS_DEFAULT_KIND: DesktopStatusKind = "resident";

function cloneMetrics(metrics: SystemPerformanceMetric[]): SystemPerformanceMetric[] {
  return metrics.map((metric) => ({ ...metric }));
}

function cloneStateMap(states: DesktopStatusStateMap): DesktopStatusStateMap {
  return {
    resident: {
      ...states.resident,
      metrics: cloneMetrics(states.resident.metrics),
    },
    media: { ...states.media },
    download: { ...states.download },
    update: { ...states.update },
    clipboard: { ...states.clipboard },
    focus: { ...states.focus },
  };
}

export function createDesktopStatusStateMap(metrics: SystemPerformanceMetric[]): DesktopStatusStateMap {
  return cloneStateMap(createDesktopStatusStateTemplates(cloneMetrics(metrics)));
}

export function resolveDesktopStatusState(input: DesktopStatusResolverInput): DesktopStatusState {
  const states = cloneStateMap({
    ...createDesktopStatusStateTemplates(cloneMetrics(input.metrics)),
    ...input.states,
    resident: {
      ...createDesktopStatusStateTemplates(cloneMetrics(input.metrics)).resident,
      ...input.states?.resident,
      metrics: cloneMetrics(input.states?.resident?.metrics ?? input.metrics),
    },
  });
  const activeKinds = input.activeKinds?.length ? input.activeKinds : undefined;
  const preferredKind = input.preferredKind;
  const candidateKinds = [
    preferredKind,
    ...(activeKinds ?? []),
    DESKTOP_STATUS_DEFAULT_KIND,
  ].filter((kind, index, list): kind is DesktopStatusKind => Boolean(kind) && list.indexOf(kind) === index);

  const resolvedKind =
    candidateKinds.find((kind) => DESKTOP_STATUS_TEMPLATE_ORDER.includes(kind)) ?? DESKTOP_STATUS_DEFAULT_KIND;

  return states[resolvedKind];
}

export function listDesktopStatusStates(metrics: SystemPerformanceMetric[]): DesktopStatusState[] {
  const states = createDesktopStatusStateMap(metrics);
  return DESKTOP_STATUS_TEMPLATE_ORDER.map((kind) => states[kind]);
}
