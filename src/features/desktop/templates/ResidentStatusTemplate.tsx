import { Cpu } from "lucide-react";
import type { DesktopResidentState, SystemPerformanceMetric } from "../../../types/hub";

type ResidentStatusTemplateProps = {
  state: DesktopResidentState;
};

export function ResidentStatusTemplate({ state }: ResidentStatusTemplateProps) {
  return (
    <>
      <div className="product-status-icon" aria-hidden="true">
        <Cpu size={36} strokeWidth={2.35} />
      </div>

      <div className="product-status-metrics">
        {state.metrics.map((metric) => {
          const accent = metricAccent(metric);
          const label = `${metric.label} 当前使用率 ${metric.value}%`;

          return (
            <div className="product-status-metric" key={metric.id} aria-label={label} title={label}>
              <div className="product-status-label">
                <strong>{metric.label}</strong>
                <span>{metric.value}%</span>
              </div>
              <span
                className="product-status-track"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={metric.value}
              >
                <span
                  style={{
                    width: `${visibleMetricValue(metric.value)}%`,
                    background: accent,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function visibleMetricValue(value: number) {
  return value <= 0 ? 8 : Math.max(value, 8);
}

function metricAccent(metric: SystemPerformanceMetric) {
  if (metric.value > 80) {
    return "linear-gradient(90deg, #fb923c 0%, #ef4444 100%)";
  }

  if (metric.value >= 50) {
    switch (metric.tone) {
      case "blue":
        return "linear-gradient(90deg, #2f8fed 0%, #60a5fa 100%)";
      case "violet":
        return "linear-gradient(90deg, #7c6cff 0%, #a78bfa 100%)";
      case "cyan":
        return "linear-gradient(90deg, #0fa7ad 0%, #2dd4bf 100%)";
    }
  }

  switch (metric.tone) {
    case "blue":
      return "linear-gradient(90deg, #1473f8 0%, #2f8fed 100%)";
    case "violet":
      return "linear-gradient(90deg, #6d5dfc 0%, #8b7cff 100%)";
    case "cyan":
      return "linear-gradient(90deg, #079aa2 0%, #0fa7ad 100%)";
  }
}
