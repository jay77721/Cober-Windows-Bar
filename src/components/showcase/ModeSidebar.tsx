import type { HubMode } from "../../types/hub";

type ModeSidebarProps = {
  activeMode: HubMode;
  onModeChange: (mode: HubMode) => void;
};

const modes: Array<{ mode: HubMode; title: string; text: string }> = [
  { mode: "idle", title: "悬浮模式", text: "独立悬浮在任务栏上方，可自动展开或收起。" },
  { mode: "music", title: "音乐播放", text: "展示封面、歌名、进度和基础播放控制。" },
  { mode: "aiProgress", title: "AI 任务", text: "显示生成中、等待响应、完成等进度状态。" },
  { mode: "download", title: "下载状态", text: "展示文件进度、大小和百分比。" },
  { mode: "notification", title: "消息通知", text: "收到消息后短暂展开，并自动回到空闲。" },
  { mode: "multiTask", title: "多任务堆叠", text: "多个任务同时存在时展开为状态列表。" },
];

export function ModeSidebar({ activeMode, onModeChange }: ModeSidebarProps) {
  return (
    <aside className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">
          Windows 11 智能状态中心
        </h1>
        <p className="mt-2 text-2xl font-semibold text-slate-200">Smart Status Hub</p>
        <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
          位于屏幕右下角，展示正在进行的任务和重要通知，支持多种显示模式，可与任务栏融合。
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-sky-300/30 to-transparent" />

      <div>
        <h2 className="text-xl font-semibold text-sky-300">显示模式</h2>
        <div className="mt-4 space-y-3">
          {modes.map((item, index) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onModeChange(item.mode)}
              className={`group flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                activeMode === item.mode
                  ? "border-sky-300/40 bg-sky-300/12 shadow-glow"
                  : "border-white/8 bg-white/5 hover:border-sky-200/24 hover:bg-white/8"
              }`}
            >
              <span className="text-2xl font-semibold text-sky-200 drop-shadow-[0_0_12px_rgba(125,211,252,0.7)]">
                {index + 1}
              </span>
              <span>
                <span className="block font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-300">{item.text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
