import { RefreshCw } from "lucide-react";
import type { DesktopUpdateState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";

type UpdateStatusTemplateProps = {
  state: DesktopUpdateState;
};

export function UpdateStatusTemplate({ state }: UpdateStatusTemplateProps) {
  return (
    <>
      <div className="product-status-icon" aria-hidden="true">
        <RefreshCw size={33} strokeWidth={2.2} />
      </div>
      <DesktopStatusTemplateFrame eyebrow="更新态" title={state.title} subtitle={state.subtitle}>
        <div className="product-status-template-meta">
          <span>{state.detail}</span>
          <span>{state.progress}%</span>
        </div>
        <StatusLine value={state.progress} />
      </DesktopStatusTemplateFrame>
    </>
  );
}

function StatusLine({ value }: { value: number }) {
  return (
    <span
      className="product-status-track"
      role="progressbar"
      aria-label={`更新进度 ${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        style={{
          width: `${Math.max(8, Math.min(100, value))}%`,
          background: "linear-gradient(90deg, #f59e0b 0%, #fb923c 100%)",
        }}
      />
    </span>
  );
}
