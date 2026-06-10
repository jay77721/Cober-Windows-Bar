import { Music4 } from "lucide-react";
import { getDesktopStatusTemplateChromeCopy } from "../../../data/desktopStatusConfig";
import type { DesktopMediaState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";
import { GuestSourceHealthIndicator } from "./GuestSourceHealthIndicator";

type MediaStatusTemplateProps = {
  state: DesktopMediaState;
};

export function MediaStatusTemplate({ state }: MediaStatusTemplateProps) {
  const copy = getDesktopStatusTemplateChromeCopy();

  return (
    <>
      <div className="product-status-icon product-status-icon-media" aria-hidden="true">
        <Music4 size={18} strokeWidth={2.1} />
        <GuestSourceHealthIndicator sourceHealth={state.sourceHealth} />
      </div>
      <DesktopStatusTemplateFrame
        eyebrow={copy.mediaEyebrow}
        title={state.title}
        subtitle={state.subtitle}
        meta={
          <>
            <span>{state.artist}</span>
            <span>{state.timeLabel}</span>
          </>
        }
      >
        <StatusRail value={state.progress} label={`${copy.mediaProgress} ${state.progress}%`} accent="violet" />
      </DesktopStatusTemplateFrame>
    </>
  );
}

function StatusRail({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: "violet" | "green" | "orange";
}) {
  return (
    <span
      className={`product-status-track product-status-track-${accent}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: `${Math.max(12, Math.min(100, value))}%` }} />
    </span>
  );
}
