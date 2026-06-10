import { RefreshCw } from "lucide-react";
import { getDesktopStatusTemplateChromeCopy } from "../../../data/desktopStatusConfig";
import type { DesktopUpdateState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";
import { GuestSourceHealthIndicator } from "./GuestSourceHealthIndicator";

type UpdateStatusTemplateProps = {
  state: DesktopUpdateState;
};

export function UpdateStatusTemplate({ state }: UpdateStatusTemplateProps) {
  const copy = getDesktopStatusTemplateChromeCopy();

  return (
    <>
      <div className="product-status-icon product-status-icon-update" aria-hidden="true">
        <RefreshCw size={18} strokeWidth={2.1} />
        <GuestSourceHealthIndicator sourceHealth={state.sourceHealth} />
      </div>
      <DesktopStatusTemplateFrame
        eyebrow={copy.updateEyebrow}
        title={state.title}
        subtitle={state.subtitle}
        meta={
          <>
            <span>{state.detail}</span>
          </>
        }
      />
    </>
  );
}
