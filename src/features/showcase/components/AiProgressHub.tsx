import type { HubTask } from "../../../types/hub";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { StatusIcon } from "../../../shared/ui/StatusIcon";

type AiProgressHubProps = {
  task: HubTask;
};

export function AiProgressHub({ task }: AiProgressHubProps) {
  return (
    <div className="hub-card-lg flex items-center gap-4 rounded-[22px] px-5 py-4">
      <StatusIcon type="ai" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{task.title}</div>
        <div className="mt-1 truncate text-xs text-slate-200">{task.subtitle}</div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={task.progress ?? 0} tone="blue" label="AI task progress" />
          <span className="w-10 text-right text-sm tabular-nums text-slate-100">{task.progress}%</span>
        </div>
      </div>
    </div>
  );
}
