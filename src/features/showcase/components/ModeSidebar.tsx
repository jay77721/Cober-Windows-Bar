import type { HubMode } from "../../../types/hub";
import { Bell, Bot, Download, Layers3, Music2, PanelTop } from "lucide-react";

type ModeSidebarProps = {
  activeMode: HubMode;
  onModeChange: (mode: HubMode) => void;
};

const modes: Array<{ mode: HubMode; title: string; text: string; icon: typeof PanelTop }> = [
  { mode: "idle", title: "Idle", text: "Baseline preview with no active mock or fixture events.", icon: PanelTop },
  { mode: "music", title: "Music", text: "Store-derived playback state rendered in the Hub preview.", icon: Music2 },
  { mode: "aiProgress", title: "AI Progress", text: "Mock provider task progress with title, subtitle, and percent.", icon: Bot },
  { mode: "download", title: "Download", text: "Mock transfer state with compact file progress metadata.", icon: Download },
  { mode: "notification", title: "Notification", text: "Fixture-style message preview without native notifications.", icon: Bell },
  { mode: "multiTask", title: "MultiTask", text: "Multiple mock tasks composed into one preview surface.", icon: Layers3 },
];

export function ModeSidebar({ activeMode, onModeChange }: ModeSidebarProps) {
  return (
    <aside className="space-y-5 font-['Segoe_UI','Microsoft_YaHei',system-ui,sans-serif]">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
        <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-white sm:text-[2.35rem]">
          Cober Showcase Hub
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-200">Mock status preview</p>
        <p className="mt-4 max-w-md text-[15px] leading-7 text-slate-300">
          Explore store-derived mock scenarios, mock providers, and explicit fixture states before native integration.
        </p>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-[rgba(243,248,255,0.075)] p-2 shadow-[0_18px_46px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl">
        <div className="px-3 pb-2 pt-2 text-[13px] font-semibold text-slate-300">Preview modes</div>
        <nav className="space-y-1">
          {modes.map((item) => {
            const Icon = item.icon;
            const selected = activeMode === item.mode;

            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                aria-current={selected ? "page" : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                  selected
                    ? "border-white/12 bg-white/[0.13] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_24px_rgba(0,0,0,0.18)]"
                    : "border-transparent text-slate-200 hover:border-white/8 hover:bg-white/[0.075]"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition ${
                    selected ? "bg-[#60cdff] opacity-100" : "bg-transparent opacity-0"
                  }`}
                />
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    selected
                      ? "bg-[#60cdff]/18 text-[#8bd8ff]"
                      : "bg-white/[0.055] text-slate-300 group-hover:text-slate-100"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-5">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-slate-400">{item.text}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
