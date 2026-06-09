import { StatusIcon } from "../../../shared/ui/StatusIcon";

export function IdleHub() {
  return (
    <div className="hub-idle relative flex h-16 items-center justify-center gap-4 rounded-[24px]">
      <StatusIcon type="music" />
      <StatusIcon type="ai" />
      <StatusIcon type="download" />
      <span className="absolute right-5 top-4 h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.8)]" />
      <span className="absolute bottom-0 h-px w-20 bg-cyan-300/50 blur-sm" />
    </div>
  );
}
