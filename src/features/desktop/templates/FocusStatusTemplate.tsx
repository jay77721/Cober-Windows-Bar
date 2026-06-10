import { MoonStar } from "lucide-react";
import { getDesktopStatusTemplateChromeCopy } from "../../../data/desktopStatusConfig";
import type { DesktopFocusState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";
import { GuestSourceHealthIndicator } from "./GuestSourceHealthIndicator";

type FocusStatusTemplateProps = {
  state: DesktopFocusState;
};

export function FocusStatusTemplate({ state }: FocusStatusTemplateProps) {
  const copy = getDesktopStatusTemplateChromeCopy();

  return (
    <>
      <div className="product-status-icon product-status-icon-focus" aria-hidden="true">
        <MoonStar size={18} strokeWidth={2.1} />
        <GuestSourceHealthIndicator sourceHealth={state.sourceHealth} />
      </div>
      <DesktopStatusTemplateFrame
        eyebrow={copy.focusEyebrow}
        title={state.title}
        subtitle={state.subtitle}
        meta={
          <>
            <span>{state.sessionLabel}</span>
            <span>{state.detail}</span>
          </>
        }
      />
    </>
  );
}
