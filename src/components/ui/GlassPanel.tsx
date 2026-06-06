import type { HTMLAttributes, ReactNode } from "react";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function GlassPanel({ children, className = "", ...props }: GlassPanelProps) {
  return (
    <div className={`mica-panel ${className}`} {...props}>
      {children}
    </div>
  );
}
