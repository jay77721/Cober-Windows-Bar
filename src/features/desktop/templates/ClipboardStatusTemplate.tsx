import { Clipboard } from "lucide-react";
import type { DesktopClipboardState } from "../../../types/hub";
import { DesktopStatusTemplateFrame } from "./DesktopStatusTemplateFrame";

type ClipboardStatusTemplateProps = {
  state: DesktopClipboardState;
};

export function ClipboardStatusTemplate({ state }: ClipboardStatusTemplateProps) {
  return (
    <>
      <div className="product-status-icon" aria-hidden="true">
        <Clipboard size={33} strokeWidth={2.2} />
      </div>
      <DesktopStatusTemplateFrame eyebrow="剪贴板态" title={state.title} subtitle={state.subtitle}>
        <div className="product-status-template-meta">
          <span>{state.copiedText}</span>
          <span>{state.detail}</span>
        </div>
      </DesktopStatusTemplateFrame>
    </>
  );
}
