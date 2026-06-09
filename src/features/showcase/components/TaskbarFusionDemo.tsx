import type { ReactNode } from "react";
import { BatteryMedium, Bot, CloudSun, Download, Folder, Music2, PanelTop, Search, Wifi, Volume2 } from "lucide-react";
import { ProgressBar } from "../../../shared/ui/ProgressBar";

export function TaskbarFusionDemo() {
  return (
    <section className="space-y-4 font-['Segoe_UI','Microsoft_YaHei',system-ui,sans-serif]">
      <h2 className="text-xl font-semibold text-white">Taskbar-style composition mock</h2>
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(244,249,255,0.14),rgba(221,236,255,0.07))] px-3 py-3 shadow-[0_20px_58px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
        <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-[rgba(20,31,47,0.62)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
          <div className="hidden min-w-[124px] items-center gap-2 text-xs text-slate-300 min-[1366px]:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">
              <CloudSun size={17} />
            </span>
            <span className="leading-4">
              24 C
              <br />
              Clear mock
            </span>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <TaskbarButton active label="Start area mock">
              <PanelTop className="text-[#60cdff]" size={20} />
            </TaskbarButton>
            <div className="hidden h-9 w-[160px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 text-sm text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] md:flex min-[1500px]:w-[216px]">
              <Search size={16} />
              <span className="truncate">Search mock apps and settings</span>
            </div>
            <TaskbarButton label="File shortcut mock">
              <Folder className="text-yellow-300" size={20} />
            </TaskbarButton>
            <TaskbarButton label="Browser shortcut mock">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#40c4ff] via-[#4cc38a] to-[#ffd166] text-[11px] font-semibold text-white">
                e
              </span>
            </TaskbarButton>
          </div>

          <div className="hidden min-w-0 flex-[1.35] justify-center px-1 min-[1366px]:flex min-[1700px]:px-5">
            <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-full border border-[#60cdff]/28 bg-[#60cdff]/12 px-3 py-2.5 shadow-[0_12px_34px_rgba(14,116,144,0.24),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl min-[1500px]:w-full min-[1500px]:max-w-[690px] min-[1500px]:gap-3 min-[1500px]:px-4 min-[1700px]:gap-4">
              <Music2 className="shrink-0 text-rose-300" size={18} />
              <span className="hidden min-w-0 truncate text-sm font-medium text-white min-[1500px]:block">Starline OST</span>
              <span className="hidden text-xs text-slate-300 min-[1500px]:inline">02:35 / 04:32</span>
              <span className="hidden h-6 w-px bg-white/12 min-[1500px]:block" />
              <Bot className="shrink-0 text-[#8bd8ff]" size={18} />
              <span className="whitespace-nowrap text-sm text-slate-100">AI 68%</span>
              <div className="hidden w-24 min-[1500px]:block">
                <ProgressBar value={68} tone="blue" label="Taskbar AI progress" />
              </div>
              <span className="h-6 w-px shrink-0 bg-white/12" />
              <Download className="shrink-0 text-emerald-300" size={18} />
              <span className="whitespace-nowrap text-sm text-slate-100">2.3GB / 4.8GB</span>
            </div>
          </div>

          <div className="flex min-w-[128px] items-center justify-end gap-2 text-slate-100">
            <Music2 className="hidden sm:block" size={15} />
            <Wifi size={15} />
            <Volume2 size={15} />
            <BatteryMedium className="hidden sm:block" size={16} />
            <div className="rounded-lg px-2 py-1 text-right text-xs leading-4 hover:bg-white/[0.075]">
              <div>16:20</div>
              <div>2024/05/20</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskbarButton({ active, children, label }: { active?: boolean; children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative grid h-10 w-10 place-items-center rounded-[10px] transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
        active ? "bg-white/[0.11]" : "hover:bg-white/[0.085]"
      }`}
    >
      {children}
      {active && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#60cdff]" />}
    </button>
  );
}
