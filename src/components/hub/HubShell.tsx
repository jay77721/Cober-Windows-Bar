import { AnimatePresence, motion } from "framer-motion";
import type { HubMode } from "../../types/hub";
import { aiTask, downloadTask, multiTasks, musicState, notificationState } from "../../data/mockHubData";
import { GlassPanel } from "../ui/GlassPanel";
import { AiProgressHub } from "./AiProgressHub";
import { DownloadHub } from "./DownloadHub";
import { IdleHub } from "./IdleHub";
import { MultiTaskHub } from "./MultiTaskHub";
import { MusicHub } from "./MusicHub";
import { NotificationHub } from "./NotificationHub";

type HubShellProps = {
  mode: HubMode;
};

export function HubShell({ mode }: HubShellProps) {
  return (
    <GlassPanel className="inline-flex rounded-[24px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {mode === "idle" && <IdleHub />}
          {mode === "music" && <MusicHub music={musicState} />}
          {mode === "aiProgress" && <AiProgressHub task={aiTask} />}
          {mode === "download" && <DownloadHub task={downloadTask} />}
          {mode === "notification" && <NotificationHub notification={notificationState} />}
          {mode === "multiTask" && <MultiTaskHub tasks={multiTasks} />}
        </motion.div>
      </AnimatePresence>
    </GlassPanel>
  );
}
