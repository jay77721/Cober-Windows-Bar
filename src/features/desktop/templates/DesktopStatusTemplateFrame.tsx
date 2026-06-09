import type { ReactNode } from "react";

type DesktopStatusTemplateFrameProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function DesktopStatusTemplateFrame({
  eyebrow,
  title,
  subtitle,
  children,
}: DesktopStatusTemplateFrameProps) {
  return (
    <div className="product-status-state" data-status-eyebrow={eyebrow}>
      <div className="product-status-state-copy">
        <span className="product-status-state-eyebrow">{eyebrow}</span>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="product-status-state-body">{children}</div>
    </div>
  );
}
