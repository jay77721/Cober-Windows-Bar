import { useEffect, useState } from "react";
import type { HubMode } from "./types/hub";
import { HubShell } from "./components/hub/HubShell";
import { FluentStyleGuide } from "./components/showcase/FluentStyleGuide";
import { ModeSidebar } from "./components/showcase/ModeSidebar";
import { StatusFlow } from "./components/showcase/StatusFlow";
import { TaskbarFusionDemo } from "./components/showcase/TaskbarFusionDemo";

export default function App() {
  const [activeMode, setActiveMode] = useState<HubMode>("idle");

  useEffect(() => {
    if (activeMode !== "notification") {
      return;
    }

    const timer = window.setTimeout(() => setActiveMode("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [activeMode]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_76%_22%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(135deg,#071324,#06101d_44%,#091a2a)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/30 to-transparent" />

      <div className="relative mx-auto grid max-w-[1600px] gap-8 px-6 py-8 lg:grid-cols-[420px_1fr]">
        <ModeSidebar activeMode={activeMode} onModeChange={setActiveMode} />

        <div className="space-y-8">
          <section className="flex min-h-[210px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.035] p-8">
            <div className="text-center">
              <div className="mb-7 text-sm font-semibold text-sky-300">当前悬浮栏预览</div>
              <HubShell mode={activeMode} />
            </div>
          </section>

          <StatusFlow activeMode={activeMode} />
          <TaskbarFusionDemo />
          <FluentStyleGuide />
        </div>
      </div>
    </main>
  );
}
