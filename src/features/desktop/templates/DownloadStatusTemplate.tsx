import { Download } from "lucide-react";
import type { DesktopDownloadState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";

type DownloadStatusTemplateProps = {
  state: DesktopDownloadState;
};

export function DownloadStatusTemplate({ state }: DownloadStatusTemplateProps) {
  return (
    <>
      <div className="product-status-icon" aria-hidden="true">
        <Download size={34} strokeWidth={2.2} />
      </div>
      <DesktopStatusTemplateFrame eyebrow="下载态" title={state.title} subtitle={state.subtitle}>
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
      aria-label={`下载进度 ${value}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        style={{
          width: `${Math.max(8, Math.min(100, value))}%`,
          background: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
        }}
      />
    </span>
  );
}
