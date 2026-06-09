import { systemPerformanceMetrics } from "../data/mockHubData";
import type { SystemPerformanceMetric } from "../types/hub";
import { getTauriInvoke, type TauriInvoke } from "./tauriRuntime";

export const TAURI_SYSTEM_PERFORMANCE_COMMAND = "get_system_performance";

const SYSTEM_PERFORMANCE_LABELS = {
  cpu: "CPU",
  memory: "\u5185\u5B58",
  network: "\u7F51\u7EDC",
} as const;

export type SystemPerformanceSnapshot = {
  cpu: number;
  memory: number;
  network: number;
};

export async function loadSystemPerformance({
  invoke = getTauriInvoke(),
}: {
  invoke?: TauriInvoke;
} = {}): Promise<SystemPerformanceMetric[]> {
  if (!invoke) {
    return systemPerformanceMetrics;
  }

  try {
    const snapshot = parseSystemPerformanceSnapshot(await invoke(TAURI_SYSTEM_PERFORMANCE_COMMAND));

    if (!snapshot) {
      return systemPerformanceMetrics;
    }

    return [
      { id: "cpu", label: SYSTEM_PERFORMANCE_LABELS.cpu, value: snapshot.cpu, tone: "blue" },
      { id: "memory", label: SYSTEM_PERFORMANCE_LABELS.memory, value: snapshot.memory, tone: "violet" },
      { id: "network", label: SYSTEM_PERFORMANCE_LABELS.network, value: snapshot.network, tone: "cyan" },
    ];
  } catch {
    return systemPerformanceMetrics;
  }
}

function parseSystemPerformanceSnapshot(value: unknown): SystemPerformanceSnapshot | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const cpu = toPercent(value.cpu);
  const memory = toPercent(value.memory);
  const network = toPercent(value.network);

  if (cpu === undefined || memory === undefined || network === undefined) {
    return undefined;
  }

  return { cpu, memory, network };
}

function toPercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
