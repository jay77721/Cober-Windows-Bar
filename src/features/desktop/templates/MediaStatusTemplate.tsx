import { Music4 } from "lucide-react";
import type { DesktopMediaState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";

type MediaStatusTemplateProps = {
  state: DesktopMediaState;
};

export function MediaStatusTemplate({ state }: MediaStatusTemplateProps) {
  return (
    <>
      <div className="product-status-icon" aria-hidden="true">
        <Music4 size={34} strokeWidth={2.2} />
      </div>
      <DesktopStatusTemplateFrame eyebrow="媒体态" title={state.title} subtitle={state.subtitle}>
        <div className="product-status-template-meta">
          <span>{state.artist}</span>
          <span>{state.timeLabel}</span>
        </div>
        <StatusLine value={state.progress} accent={state.accent} label={`媒体进度 ${state.progress}%`} />
      </DesktopStatusTemplateFrame>
    </>
  );
}

type StatusLineProps = {
  value: number;
  accent: string;
  label: string;
};

function StatusLine({ value, accent, label }: StatusLineProps) {
  return (
    <span
      className="product-status-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${Math.max(8, Math.min(100, value))}%`, background: accentColor(accent) }} />
    </span>
  );
}

function accentColor(accent: string) {
  switch (accent) {
    case "violet":
      return "linear-gradient(90deg, #7c6cff 0%, #a78bfa 100%)";
    case "pink":
      return "linear-gradient(90deg, #ec4899 0%, #f472b6 100%)";
    default:
      return "linear-gradient(90deg, #2f8fed 0%, #60a5fa 100%)";
  }
}
