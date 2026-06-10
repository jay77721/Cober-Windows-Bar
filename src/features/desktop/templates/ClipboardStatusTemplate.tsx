import { Clipboard } from "lucide-react";
import { getDesktopStatusTemplateChromeCopy } from "../../../data/desktopStatusConfig";
import type { DesktopClipboardState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";
import { GuestSourceHealthIndicator } from "./GuestSourceHealthIndicator";

type ClipboardStatusTemplateProps = {
  state: DesktopClipboardState;
};

export function ClipboardStatusTemplate({ state }: ClipboardStatusTemplateProps) {
  const copy = getDesktopStatusTemplateChromeCopy();

  return (
    <>
      <div className="product-status-icon product-status-icon-clipboard" aria-hidden="true">
        <Clipboard size={18} strokeWidth={2.1} />
        <GuestSourceHealthIndicator sourceHealth={state.sourceHealth} />
      </div>
      <DesktopStatusTemplateFrame
        eyebrow={copy.clipboardEyebrow}
        title={state.title}
        subtitle={state.subtitle}
        meta={
          <>
            <span>{state.copiedText}</span>
            <span>{state.detail}</span>
          </>
        }
      />
    </>
  );
}
