import { Bot, Download, Music2 } from "lucide-react";
import { ProgressBar } from "../ui/ProgressBar";

export function FluentStyleGuide() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-sky-300">视觉风格</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <SpecCard title="背景" value="Acrylic / Mica" />
          <SpecCard title="圆角" value="16px ~ 24px" />
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="text-sm text-slate-300">图标风格</div>
            <div className="mt-3 flex gap-2">
              <Music2 className="text-rose-300" />
              <Bot className="text-sky-300" />
              <Download className="text-emerald-300" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="text-sm text-slate-300">进度条</div>
            <div className="mt-3 space-y-3">
              <ProgressBar value={64} tone="pink" />
              <ProgressBar value={68} tone="blue" />
              <ProgressBar value={48} tone="green" />
            </div>
          </div>
          <SpecCard title="动画" value="ease-out 220ms" />
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold text-sky-300">位置示意</h2>
        <div className="relative h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/40 via-blue-700/30 to-slate-950 p-5">
          <div className="absolute bottom-0 left-0 right-0 flex h-12 items-center justify-center gap-5 border-t border-white/15 bg-slate-950/60">
            <span>⌃</span>
            <span className="rounded bg-sky-400 px-2 py-1">⊞</span>
            <span>📁</span>
            <span>🌐</span>
            <span className="text-xs">16:20</span>
          </div>
          <div className="absolute bottom-[58px] right-5">
            <div className="rounded-[22px] border border-sky-200/25 bg-slate-950/50 p-3 shadow-glow backdrop-blur">
              <div className="flex gap-3">
                <Music2 className="text-rose-300" />
                <Bot className="text-sky-300" />
                <Download className="text-emerald-300" />
              </div>
            </div>
          </div>
          <div className="absolute right-8 top-8 rounded-xl border border-white/15 bg-white/15 px-4 py-3 text-sm text-slate-100">
            悬浮在任务栏上方
            <br />
            10px 间距
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-3 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
