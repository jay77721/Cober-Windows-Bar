import type { HubMode } from "../../../types/hub";
import { showcaseSteps } from "../../../data/mockHubData";
import { HubShell } from "./HubShell";

type StatusFlowProps = {
  activeMode: HubMode;
};

const modeDetails: Record<HubMode, { label: string; caption: string }> = {
  idle: {
    label: "Idle baseline",
    caption: "Compact fallback when no showcase event is active.",
  },
  music: {
    label: "Mock music state",
    caption: "Fixture-backed media controls for the Hub preview.",
  },
  aiProgress: {
    label: "AI progress",
    caption: "Mock provider task progress rendered in the Hub shell.",
  },
  download: {
    label: "Download progress",
    caption: "Static file-transfer fallback with progress state.",
  },
  notification: {
    label: "Notification fixture",
    caption: "Mock message state, not a native Windows notification.",
  },
  multiTask: {
    label: "Stacked tasks",
    caption: "Multiple mock tasks composed in the same Hub surface.",
  },
};

export function StatusFlow({ activeMode }: StatusFlowProps) {
  const activeModeLabel = modeDetails[activeMode].label;

  return (
    <section className="space-y-5 font-['Segoe_UI','Microsoft_YaHei',system-ui,sans-serif]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Resolved mode matrix</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Static fallback previews for the mock and fixture showcase states.
          </p>
        </div>
        <div className="max-w-full rounded-full border border-white/12 bg-white/[0.08] px-4 py-2 text-sm font-medium text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
          Current: {activeModeLabel}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 min-[1700px]:grid-cols-3">
        {showcaseSteps.map((step) => {
          const selected = activeMode === step.mode;
          const details = modeDetails[step.mode];
          return (
            <div
              key={step.id}
              className={`group relative min-h-[180px] overflow-hidden rounded-[18px] border p-4 transition duration-200 ${
                selected
                  ? "border-[#60cdff]/45 bg-[rgba(235,247,255,0.115)] shadow-[0_18px_50px_rgba(3,105,161,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]"
                  : "border-white/10 bg-[rgba(235,247,255,0.055)] shadow-[0_14px_34px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.11)] hover:border-white/16 hover:bg-[rgba(235,247,255,0.085)]"
              } backdrop-blur-2xl`}
            >
              <div
                className={`absolute left-0 top-5 h-8 w-[3px] rounded-r-full transition ${
                  selected ? "bg-[#60cdff]" : "bg-white/0 group-hover:bg-white/24"
                }`}
              />
              <div className="mb-4 flex items-start justify-between gap-3 pl-2">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white">{details.label}</div>
                  <div className="mt-1 text-sm text-slate-400">{details.caption}</div>
                </div>
                <span
                  className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  selected
                    ? "bg-[#60cdff]/18 text-[#a8e5ff]"
                    : "bg-white/[0.055] text-slate-400 group-hover:text-slate-300"
                  }`}
                >
                  {selected ? "Previewing" : "Available"}
                </span>
              </div>
              <div className="flex min-h-24 items-center justify-center rounded-[14px] border border-white/[0.07] bg-black/[0.08] px-3 py-4">
                <HubShell mode={step.mode} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
