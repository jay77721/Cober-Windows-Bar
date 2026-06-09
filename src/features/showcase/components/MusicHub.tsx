import { Pause, SkipBack, SkipForward } from "lucide-react";
import type { MusicState } from "../../../types/hub";
import { ProgressBar } from "../../../shared/ui/ProgressBar";

type MusicHubProps = {
  music: MusicState;
};

export function MusicHub({ music }: MusicHubProps) {
  return (
    <div className="hub-card-lg flex items-center gap-4 rounded-[22px] px-4 py-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-pink-300 via-violet-400 to-blue-500 text-xl font-bold shadow-glow">
        OST
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{music.title}</div>
        <div className="truncate text-xs text-slate-300">{music.subtitle}</div>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar value={music.progress} tone="pink" label="Music playback progress" />
          <span className="whitespace-nowrap text-xs text-slate-300">{music.time}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-slate-100">
        <button className="hub-icon-button" type="button" aria-label="Previous track">
          <SkipBack size={17} />
        </button>
        <button className="hub-icon-button" type="button" aria-label="Pause playback">
          <Pause size={18} fill="currentColor" />
        </button>
        <button className="hub-icon-button" type="button" aria-label="Next track">
          <SkipForward size={17} />
        </button>
      </div>
    </div>
  );
}
