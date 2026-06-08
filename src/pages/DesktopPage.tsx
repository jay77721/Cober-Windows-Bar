import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BatteryMedium, Bell, Bot, Circle, Download, Layers3, Music2, Pause, Play, Wifi } from "lucide-react";
import { HubShell } from "../components/hub/HubShell";
import { createHubDemoScenario, playHubDemoScenario, type HubDemoScenarioId } from "../state/hubScenarios";
import { createHubEventBus } from "../state/hubState";
import type { HubMode, HubStoreState } from "../types/hub";

const desktopSequence: HubDemoScenarioId[] = ["idle", "music", "ai", "download", "notification", "multiTask"];

const modeLabel: Record<HubMode, string> = {
  idle: "Idle",
  music: "Music",
  aiProgress: "AI",
  download: "Download",
  notification: "Notify",
  multiTask: "Multi",
};

const modeSummary: Record<HubMode, string> = {
  idle: "No urgent desktop state. The hub stays compact and ready.",
  music: "Playback owns the glance surface with media controls and progress.",
  aiProgress: "AI work is active, so progress takes priority over passive state.",
  download: "A file transfer is active and promoted into the desktop hub.",
  notification: "Notification priority interrupts the lower-priority task stream.",
  multiTask: "Multiple active tasks collapse into one combined status center.",
};

const sources: Array<{ id: HubDemoScenarioId; label: string; icon: typeof Music2; mode: HubMode }> = [
  { id: "idle", label: "Idle", icon: Circle, mode: "idle" },
  { id: "music", label: "Music", icon: Music2, mode: "music" },
  { id: "ai", label: "AI", icon: Bot, mode: "aiProgress" },
  { id: "download", label: "Download", icon: Download, mode: "download" },
  { id: "notification", label: "Notify", icon: Bell, mode: "notification" },
  { id: "multiTask", label: "Stack", icon: Layers3, mode: "multiTask" },
];

export function DesktopPage() {
  const eventBus = useMemo(() => createHubEventBus(), []);
  const [storeState, setStoreState] = useState<HubStoreState>(() => eventBus.getState());
  const [stepIndex, setStepIndex] = useState(0);
  const [autoRun, setAutoRun] = useState(true);

  useEffect(() => eventBus.subscribe(setStoreState), [eventBus]);

  const playSource = useCallback(
    (scenarioId: HubDemoScenarioId) => {
      const nextIndex = desktopSequence.indexOf(scenarioId);
      setStepIndex(nextIndex >= 0 ? nextIndex : 0);
      playHubDemoScenario(eventBus, createHubDemoScenario(scenarioId, Date.now()), Date.now());
    },
    [eventBus],
  );

  useEffect(() => {
    const scenarioId = desktopSequence[stepIndex % desktopSequence.length] ?? "idle";
    playHubDemoScenario(eventBus, createHubDemoScenario(scenarioId, Date.now()), Date.now());
  }, [eventBus, stepIndex]);

  useEffect(() => {
    if (!autoRun) {
      return;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % desktopSequence.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [autoRun]);

  const activeEvent = storeState.events[0];
  const activeSource = sources.find((source) => source.mode === storeState.mode) ?? sources[0]!;

  return (
    <main className="desktop-preview min-h-screen overflow-hidden text-slate-50" data-testid="desktop-preview">
      <div className="desktop-preview-wallpaper" aria-hidden="true" />

      <section className="desktop-status-center" aria-label="Desktop status center prototype">
        <div className="desktop-status-shell">
          <header className="desktop-status-header">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/70">Cober Windows Bar</div>
              <h1 className="mt-1 text-lg font-semibold text-white">Desktop status center</h1>
            </div>
            <button
              type="button"
              aria-label={autoRun ? "Pause automatic mock stream" : "Play automatic mock stream"}
              onClick={() => setAutoRun((current) => !current)}
              className="desktop-run-toggle"
            >
              {autoRun ? <Pause size={15} /> : <Play size={15} />}
              {autoRun ? "Auto" : "Manual"}
            </button>
          </header>

          <div className="desktop-status-grid">
            <nav className="desktop-source-rail" aria-label="Mock status sources">
              {sources.map((source) => {
                const Icon = source.icon;
                const selected = activeSource.id === source.id;

                return (
                  <button
                    key={source.id}
                    type="button"
                    aria-pressed={selected}
                    className={`desktop-source-button ${selected ? "desktop-source-button-active" : ""}`}
                    onClick={() => {
                      setAutoRun(false);
                      playSource(source.id);
                    }}
                  >
                    <Icon size={16} />
                    <span>{source.label}</span>
                  </button>
                );
              })}
            </nav>

            <section className="desktop-hub-stage" aria-label="Resolved desktop hub">
              <div className="desktop-hub-anchor">
                <div className="desktop-hub-meta">
                  <span>{modeLabel[storeState.mode]}</span>
                  <span>{storeState.events.length} active</span>
                  <span>Mock sources</span>
                </div>
                <HubShell
                  mode={storeState.mode}
                  tasks={storeState.tasks}
                  music={storeState.music}
                  notification={storeState.notification}
                />
              </div>
            </section>

            <aside className="desktop-inspector" aria-label="Current state summary">
              <div className="desktop-inspector-card">
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-400">Focus</div>
                <div className="mt-2 text-base font-semibold text-white">{modeLabel[storeState.mode]}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{modeSummary[storeState.mode]}</p>
              </div>

              <div className="desktop-inspector-card">
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-400">Current source</div>
                <div className="mt-2 truncate text-sm font-semibold text-white">{activeEvent?.id ?? "No active event"}</div>
                <div className="mt-1 text-xs text-slate-400">{activeEvent ? `${activeEvent.type} from ${activeEvent.source}` : "Waiting for a source"}</div>
              </div>

              <div className="desktop-inspector-card">
                <div className="text-xs font-semibold uppercase tracking-normal text-slate-400">Runtime</div>
                <div className="mt-2 text-sm font-semibold text-white">Windows context mock</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">No native providers, tray, or always-on-top behavior are active in this prototype.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="desktop-taskbar" aria-label="Mock Windows taskbar">
        <div className="flex items-center gap-2">
          <span className="desktop-start-mark" aria-hidden="true" />
          <span className="hidden rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs text-slate-300 sm:inline">
            Search mock apps
          </span>
        </div>

        <div className="flex items-center gap-1.5" aria-label="Mock status modes">
          <TaskbarIcon active={storeState.mode === "music"} label="Music mode"><Music2 size={16} /></TaskbarIcon>
          <TaskbarIcon active={storeState.mode === "aiProgress"} label="AI mode"><Bot size={16} /></TaskbarIcon>
          <TaskbarIcon active={storeState.mode === "download"} label="Download mode"><Download size={16} /></TaskbarIcon>
          <TaskbarIcon active={storeState.mode === "notification"} label="Notification mode"><Bell size={16} /></TaskbarIcon>
        </div>

        <div className="flex items-center gap-2 text-slate-100">
          <Wifi size={15} />
          <BatteryMedium size={16} />
          <div className="text-right text-[11px] leading-4">
            <div>16:20</div>
            <div>{modeLabel[storeState.mode]}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TaskbarIcon({ active, children, label }: { active?: boolean; children: ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      className={`relative grid h-9 w-9 place-items-center rounded-[10px] border text-slate-100 transition ${
        active ? "border-sky-200/25 bg-sky-300/16 text-sky-100" : "border-white/8 bg-white/[0.055]"
      }`}
    >
      {children}
      {active && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-[#60cdff]" />}
    </div>
  );
}
