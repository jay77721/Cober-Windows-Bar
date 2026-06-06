import type { HubMode } from "../../types/hub";
import { showcaseSteps } from "../../data/mockHubData";
import { HubShell } from "../hub/HubShell";

type StatusFlowProps = {
  activeMode: HubMode;
};

export function StatusFlow({ activeMode }: StatusFlowProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-sky-300">状态展示：悬浮模式示例</h2>
          <p className="mt-2 text-sm text-slate-300">点击左侧模式可切换当前主状态。</p>
        </div>
        <div className="rounded-full border border-sky-200/20 bg-sky-200/10 px-4 py-2 text-sm text-sky-100">
          当前：{activeMode}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {showcaseSteps.map((step) => (
          <div key={step.id} className="min-h-[180px] rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{step.label}</div>
                <div className="mt-1 text-sm text-slate-400">{step.caption}</div>
              </div>
              {activeMode === step.mode && <span className="h-2 w-2 rounded-full bg-sky-300 shadow-glow" />}
            </div>
            <div className="flex min-h-24 items-center justify-center">
              <HubShell mode={step.mode} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
