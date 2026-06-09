import { Cpu } from "lucide-react";
import type { SystemPerformanceMetric } from "../../../types/hub";

type ResidentPerformanceHubProps = {
  metrics: SystemPerformanceMetric[];
};

export function ResidentPerformanceHub({ metrics }: ResidentPerformanceHubProps) {
  return (
    <div className="desktop-resident-performance" aria-label="Resident system performance state">
      <div className="desktop-performance-icon" aria-hidden="true">
        <Cpu size={31} strokeWidth={2.35} />
      </div>
      <div className="desktop-performance-metrics">
        {metrics.map((metric) => (
          <div className="desktop-performance-metric" key={metric.id}>
            <div className="desktop-performance-copy">
              <strong>{metric.label}</strong>
              <span>{metric.value}%</span>
            </div>
            <span
              className={`desktop-performance-track desktop-performance-track-${metric.tone}`}
              aria-hidden="true"
            >
              <span style={{ width: `${metric.value}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
