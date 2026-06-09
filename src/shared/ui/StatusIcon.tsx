import { Bot, Download, MessageCircle, Music2 } from "lucide-react";
import type { HubTaskType } from "../../types/hub";

type StatusIconProps = {
  type: HubTaskType;
  compact?: boolean;
};

const iconMap = {
  music: Music2,
  ai: Bot,
  download: Download,
  notification: MessageCircle,
};

const toneMap = {
  music: "text-rose-300 shadow-[0_0_24px_rgba(244,63,94,0.2)]",
  ai: "text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.22)]",
  download: "text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.2)]",
  notification: "text-green-200 shadow-[0_0_24px_rgba(74,222,128,0.2)]",
};

export function StatusIcon({ type, compact = false }: StatusIconProps) {
  const Icon = iconMap[type];
  return (
    <div className={`icon-tile ${compact ? "h-9 w-9 rounded-xl" : ""} ${toneMap[type]}`} aria-hidden="true">
      <Icon size={compact ? 18 : 23} strokeWidth={2.4} />
    </div>
  );
}
