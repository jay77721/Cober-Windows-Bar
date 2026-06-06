import { Bot, Download, Folder, Music2, Search, Wifi, Volume2 } from "lucide-react";
import { ProgressBar } from "../ui/ProgressBar";

export function TaskbarFusionDemo() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300">任务栏融合模式示例</h2>
      <div className="flex h-[70px] items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-5 shadow-glass">
        <div className="flex items-center gap-5 text-slate-100">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-400 text-white">⊞</div>
          <Search size={23} />
          <Folder className="text-yellow-300" size={24} />
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 text-sm font-bold">
            e
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-6 lg:flex">
          <div className="flex w-full max-w-[650px] items-center gap-5 rounded-[22px] border border-sky-300/30 bg-sky-300/10 px-4 py-3 shadow-glow">
            <Music2 className="shrink-0 text-rose-300" size={19} />
            <span className="min-w-0 truncate text-sm text-white">星穹铁道 OST</span>
            <span className="text-xs text-slate-300">02:35 / 04:32</span>
            <span className="h-6 w-px bg-white/12" />
            <Bot className="shrink-0 text-sky-300" size={18} />
            <span className="text-sm text-slate-100">AI 68%</span>
            <div className="w-24">
              <ProgressBar value={68} tone="blue" />
            </div>
            <span className="h-6 w-px bg-white/12" />
            <Download className="shrink-0 text-emerald-300" size={18} />
            <span className="text-sm text-slate-100">2.3GB / 4.8GB</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-100">
          <Music2 size={16} />
          <Wifi size={16} />
          <Volume2 size={16} />
          <div className="text-right text-xs leading-4">
            <div>16:20</div>
            <div>2024/05/20</div>
          </div>
        </div>
      </div>
    </section>
  );
}
