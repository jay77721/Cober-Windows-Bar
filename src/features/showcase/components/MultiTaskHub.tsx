import type { HubTask } from "../../../types/hub";
import { ProgressBar } from "../../../shared/ui/ProgressBar";
import { StatusIcon } from "../../../shared/ui/StatusIcon";

type MultiTaskHubProps = {
  tasks: HubTask[];
};

const toneMap = {
  music: "pink",
  ai: "blue",
  download: "green",
  notification: "blue",
} as const;

export function MultiTaskHub({ tasks }: MultiTaskHubProps) {
  return (
    <div className="hub-card-lg rounded-[22px] px-4 py-3">
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="grid grid-cols-[36px_1fr_44px] items-center gap-3">
            <StatusIcon type={task.type} compact />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{task.title}</div>
              <div className="mt-1 truncate text-xs text-slate-300">{task.subtitle}</div>
              <div className="mt-1.5">
                {task.progress !== undefined && (
                  <ProgressBar value={task.progress} tone={toneMap[task.type]} label={`${task.title} progress`} />
                )}
              </div>
            </div>
            <span className="text-right text-xs tabular-nums text-slate-100">
              {task.progress !== undefined ? `${task.progress}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
