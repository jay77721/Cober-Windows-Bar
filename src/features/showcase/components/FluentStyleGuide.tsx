import type { ReactNode } from "react";
import { Bot, Download, Folder, Music2, PanelTop, Search } from "lucide-react";
import { ProgressBar } from "../../../shared/ui/ProgressBar";

export function FluentStyleGuide() {
  return (
    <section className="grid gap-4 font-['Segoe_UI','Microsoft_YaHei',system-ui,sans-serif] xl:grid-cols-[1fr_1fr]">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Windows 11 Fluent Tokens</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 min-[1700px]:grid-cols-5">
          <SpecCard title="Mica background" value="Low contrast layers" swatch="bg-[linear-gradient(135deg,rgba(244,249,255,0.14),rgba(18,31,48,0.56))]" />
          <SpecCard title="Acrylic panel" value="blur 24-32px" swatch="bg-white/[0.12] backdrop-blur-2xl" />
          <SpecCard title="Radius scale" value="12 / 18 / 24px" swatch="bg-[#60cdff]/18" />
          <SpecCard title="Typography" value="Segoe UI + system" swatch="bg-slate-100/14" />
          <SpecCard title="Accent color" value="#60CDFF" swatch="bg-[#60cdff]" />
          <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
            <div className="text-sm text-slate-300">Icon tone</div>
            <div className="mt-3 flex gap-2">
              <IconToken tone="rose"><Music2 size={18} /></IconToken>
              <IconToken tone="sky"><Bot size={18} /></IconToken>
              <IconToken tone="green"><Download size={18} /></IconToken>
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl md:col-span-2 min-[1700px]:col-span-2">
            <div className="text-sm text-slate-300">Progress bars</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ProgressBar value={64} tone="pink" label="Fluent music progress token" />
              <ProgressBar value={68} tone="blue" label="Fluent AI progress token" />
              <ProgressBar value={48} tone="green" label="Fluent download progress token" />
            </div>
          </div>
          <SpecCard title="Motion" value="ease-out 180-220ms" swatch="bg-white/[0.08]" />
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold text-white">Position mock</h2>
        <div className="relative h-[236px] overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(86,159,255,0.28),rgba(32,49,73,0.5)_45%,rgba(8,17,31,0.9))] p-5 shadow-[0_20px_58px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.16)]">
          <div className="absolute inset-x-8 top-7 h-20 rounded-[22px] border border-white/10 bg-white/[0.045] backdrop-blur-xl" />
          <div className="absolute bottom-0 left-0 right-0 flex h-14 items-center justify-center gap-3 border-t border-white/15 bg-[rgba(14,22,34,0.72)] px-4 backdrop-blur-2xl">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.07]">
              <Search size={17} />
            </span>
            <span className="relative grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.11] text-[#60cdff]">
              <PanelTop size={18} />
              <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#60cdff]" />
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.07]">
              <Folder size={17} />
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.07]">
              <Bot size={17} />
            </span>
            <span className="ml-2 text-xs leading-4 text-slate-100">
              16:20
              <br />
              2024/05/20
            </span>
          </div>
          <div className="absolute bottom-[66px] right-5">
            <div className="rounded-[24px] border border-[#60cdff]/28 bg-[#60cdff]/12 p-3 shadow-[0_16px_40px_rgba(14,116,144,0.25),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <div className="flex gap-3">
                <Music2 className="text-rose-300" />
                <Bot className="text-[#8bd8ff]" />
                <Download className="text-emerald-300" />
              </div>
            </div>
          </div>
          <div className="absolute right-8 top-8 rounded-[14px] border border-white/12 bg-white/[0.11] px-4 py-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
            Floats above the taskbar
            <br />
            10px gap
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecCard({ title, value, swatch }: { title: string; value: string; swatch: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl">
      <div className={`mb-3 h-8 rounded-[12px] border border-white/10 ${swatch}`} />
      <div className="text-sm text-slate-300">{title}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function IconToken({ children, tone }: { children: ReactNode; tone: "rose" | "sky" | "green" }) {
  const toneClass = {
    rose: "bg-rose-300/12 text-rose-300",
    sky: "bg-[#60cdff]/14 text-[#8bd8ff]",
    green: "bg-emerald-300/12 text-emerald-300",
  }[tone];

  return <div className={`grid h-9 w-9 place-items-center rounded-[10px] ${toneClass}`}>{children}</div>;
}
