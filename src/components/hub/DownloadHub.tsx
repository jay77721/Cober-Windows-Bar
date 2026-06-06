import type { HubTask } from "../../types/hub";
import { ProgressBar } from "../ui/ProgressBar";
import { StatusIcon } from "../ui/StatusIcon";

type DownloadHubProps = {
  task: HubTask;
};

export function DownloadHub({ task }: DownloadHubProps) {
  return (
    <div className="flex w-[310px] items-center gap-4 rounded-[22px] px-4 py-4">
      <StatusIcon type="download" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-white">{task.title}</span>
          <span className="text-sm text-slate-100">{task.progress}%</span>
        </div>
        <div className="mt-1 text-xs text-slate-300">{task.subtitle}</div>
        <div className="mt-3">
          <ProgressBar value={task.progress ?? 0} tone="green" />
        </div>
      </div>
    </div>
  );
}
