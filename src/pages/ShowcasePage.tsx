import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HubShell } from "../components/hub/HubShell";
import { EventPlaygroundPanel } from "../components/showcase/EventPlaygroundPanel";
import { FluentStyleGuide } from "../components/showcase/FluentStyleGuide";
import { ModeSidebar } from "../components/showcase/ModeSidebar";
import { StatusFlow } from "../components/showcase/StatusFlow";
import { TaskbarFusionDemo } from "../components/showcase/TaskbarFusionDemo";
import {
  createAutoDemoSequence,
  createHubDemoScenario,
  playHubDemoScenario,
  type HubDemoScenarioId,
} from "../state/hubScenarios";
import { createHubEventBus } from "../state/hubState";
import {
  createMockAiTaskProvider,
  createMockDownloadProvider,
  createMockMusicProvider,
  createMockNotificationProvider,
} from "../providers/mockProviders";
import { connectProviderToEventBus, type ProviderConnection } from "../providers/providerAdapter";
import type { HubProvider } from "../providers/types";
import { loadTauriFixtureHubEvents } from "../runtime/tauriRuntime";
import type { HubMode, HubStoreState } from "../types/hub";

type ProviderDemoId = "music" | "ai" | "download" | "notification";

type ActiveProviderDemo = {
  provider: HubProvider;
  connection: ProviderConnection;
};

export function ShowcasePage() {
  const eventBus = useMemo(() => createHubEventBus(), []);
  const [storeState, setStoreState] = useState<HubStoreState>(() => eventBus.getState());
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [activeProviderLabel, setActiveProviderLabel] = useState<string>();
  const [tauriFixtureLabel, setTauriFixtureLabel] = useState<string>();
  const demoTimers = useRef<number[]>([]);
  const activeProviderDemo = useRef<ActiveProviderDemo | undefined>(undefined);
  const tauriFixtureRequestId = useRef(0);
  const activeMode = storeState.mode;

  const clearDemoTimers = useCallback(() => {
    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    demoTimers.current = [];
  }, []);

  const stopProviderDemo = useCallback(() => {
    tauriFixtureRequestId.current += 1;
    activeProviderDemo.current?.connection.disconnect();
    activeProviderDemo.current?.provider.stop();
    activeProviderDemo.current = undefined;
    setActiveProviderLabel(undefined);
    setTauriFixtureLabel(undefined);
  }, []);

  const stopAutoDemo = useCallback(() => {
    clearDemoTimers();
    setIsAutoRunning(false);
  }, [clearDemoTimers]);

  const createProviderDemo = useCallback((id: ProviderDemoId) => {
    const options = { now: () => Date.now() };
    const providerById: Record<ProviderDemoId, () => HubProvider> = {
      music: () => createMockMusicProvider(options),
      ai: () => createMockAiTaskProvider(options),
      download: () => createMockDownloadProvider(options),
      notification: () => createMockNotificationProvider(options),
    };

    return providerById[id]();
  }, []);

  const triggerProviderDemo = useCallback(
    (id: ProviderDemoId) => {
      stopAutoDemo();
      stopProviderDemo();

      const provider = createProviderDemo(id);
      const connection = connectProviderToEventBus(provider, eventBus);
      activeProviderDemo.current = { provider, connection };
      setActiveProviderLabel(provider.label);
      provider.start();
    },
    [createProviderDemo, eventBus, stopAutoDemo, stopProviderDemo],
  );

  const playScenario = useCallback(
    (id: HubDemoScenarioId) => {
      stopAutoDemo();
      stopProviderDemo();
      playHubDemoScenario(eventBus, createHubDemoScenario(id, Date.now()), Date.now());
    },
    [eventBus, stopAutoDemo, stopProviderDemo],
  );

  const handleModeChange = useCallback(
    (mode: HubMode) => {
      const scenarioByMode: Record<HubMode, HubDemoScenarioId> = {
        idle: "idle",
        music: "music",
        aiProgress: "ai",
        download: "download",
        notification: "notification",
        multiTask: "multiTask",
      };

      playScenario(scenarioByMode[mode]);
    },
    [playScenario],
  );

  const startAutoDemo = useCallback(() => {
    clearDemoTimers();
    stopProviderDemo();
    setIsAutoRunning(true);

    let delay = 0;
    const sequence = createAutoDemoSequence(Date.now());

    sequence.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        playHubDemoScenario(eventBus, createHubDemoScenario(step.id, Date.now()), Date.now());

        if (index === sequence.length - 1) {
          setIsAutoRunning(false);
          demoTimers.current = [];
        }
      }, delay);

      demoTimers.current.push(timer);
      delay += step.durationMs;
    });
  }, [clearDemoTimers, eventBus, stopProviderDemo]);

  const clearProviderDemo = useCallback(() => {
    stopProviderDemo();
    playHubDemoScenario(eventBus, createHubDemoScenario("idle", Date.now()), Date.now());
  }, [eventBus, stopProviderDemo]);

  const triggerTauriFixtureDemo = useCallback(async () => {
    stopAutoDemo();
    stopProviderDemo();
    const requestId = ++tauriFixtureRequestId.current;
    setTauriFixtureLabel("Loading fixture");

    const result = await loadTauriFixtureHubEvents();

    if (requestId !== tauriFixtureRequestId.current) {
      return;
    }

    if (result.ok) {
      result.events.forEach((event) => eventBus.publishHubEvent(event));
    }

    setTauriFixtureLabel(result.ok ? "Tauri fixture published" : `Tauri ${result.diagnostic.code}`);
  }, [eventBus, stopAutoDemo, stopProviderDemo]);

  useEffect(() => {
    return eventBus.subscribe(setStoreState);
  }, [eventBus]);

  useEffect(() => {
    const nextExpiresAt = storeState.events.reduce<number | undefined>((next, event) => {
      if (event.expiresAt === undefined) {
        return next;
      }

      return next === undefined ? event.expiresAt : Math.min(next, event.expiresAt);
    }, undefined);

    if (nextExpiresAt === undefined) {
      return;
    }

    const timer = window.setTimeout(
      () => eventBus.clearExpiredEvents(Date.now()),
      Math.max(0, nextExpiresAt - Date.now() + 24),
    );

    return () => window.clearTimeout(timer);
  }, [eventBus, storeState.events]);

  useEffect(() => {
    return () => {
      clearDemoTimers();
      stopProviderDemo();
    };
  }, [clearDemoTimers, stopProviderDemo]);

  return (
    <main className="showcase-desktop relative min-h-screen overflow-x-hidden text-slate-50">
      <div className="showcase-wallpaper" aria-hidden="true" />
      <div className="showcase-wallpaper-grain" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1800px] flex-col px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
        <div className="showcase-window flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:min-h-[calc(100vh-3rem)]">
          <div className="showcase-titlebar">
            <div className="flex min-w-0 items-center gap-3">
              <span className="showcase-app-icon" aria-hidden="true" />
              <span className="truncate text-[13px] font-medium text-slate-200">Cober Showcase</span>
            </div>
            <div className="flex items-center" aria-hidden="true">
              <span className="showcase-window-control" />
              <span className="showcase-window-control" />
              <span className="showcase-window-control showcase-window-control-close" />
            </div>
          </div>

          <div className="grid flex-1 gap-6 p-4 sm:p-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:p-6 2xl:grid-cols-[392px_minmax(0,1fr)]">
            <ModeSidebar activeMode={activeMode} onModeChange={handleModeChange} />

            <div className="min-w-0 space-y-6">
              <section className="showcase-preview-panel flex min-h-[218px] items-center justify-center p-6 sm:p-8">
                <div className="text-center">
                  <div className="mb-7 text-sm font-semibold text-sky-200">v0.2 Interactive Event Playground / Resolved floating bar preview</div>
                  <HubShell mode={activeMode} />
                </div>
              </section>

              <EventPlaygroundPanel
                activeEvents={storeState.events}
                currentMode={activeMode}
                isAutoRunning={isAutoRunning}
                onMusic={() => playScenario("music")}
                onAi={() => playScenario("ai")}
                onDownload={() => playScenario("download")}
                onNotification={() => playScenario("notification")}
                onMultiTask={() => playScenario("multiTask")}
                onClear={() => playScenario("idle")}
                onStartDemo={startAutoDemo}
                activeProviderLabel={activeProviderLabel}
                onProviderMusic={() => triggerProviderDemo("music")}
                onProviderAi={() => triggerProviderDemo("ai")}
                onProviderDownload={() => triggerProviderDemo("download")}
                onProviderNotification={() => triggerProviderDemo("notification")}
                onProviderStop={stopProviderDemo}
                onProviderClear={clearProviderDemo}
                tauriFixtureLabel={tauriFixtureLabel}
                onTauriFixture={triggerTauriFixtureDemo}
              />

              <StatusFlow activeMode={activeMode} />
              <TaskbarFusionDemo />
              <FluentStyleGuide />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
