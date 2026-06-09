import { AnimatePresence, motion } from "framer-motion";
import type { HubMode, HubTask, MusicState, NotificationState } from "../../../types/hub";
import { aiTask, downloadTask, multiTasks, musicState, notificationState } from "../../../data/mockHubData";
import { GlassPanel } from "../../../shared/ui/GlassPanel";
import { AiProgressHub } from "./AiProgressHub";
import { DownloadHub } from "./DownloadHub";
import { IdleHub } from "./IdleHub";
import { MultiTaskHub } from "./MultiTaskHub";
import { MusicHub } from "./MusicHub";
import { NotificationHub } from "./NotificationHub";

type HubShellProps = {
  mode: HubMode;
  tasks?: HubTask[];
  music?: MusicState;
  notification?: NotificationState;
};

export function HubShell({ mode, tasks = [], music, notification }: HubShellProps) {
  const musicDisplay = music ?? musicState;
  const aiDisplay = tasks.find((task) => task.type === "ai") ?? aiTask;
  const downloadDisplay = tasks.find((task) => task.type === "download") ?? downloadTask;
  const notificationDisplay = notification ?? notificationState;
  const multiTaskDisplay = tasks.length > 0 ? tasks : multiTasks;

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
          {mode === "music" && <MusicHub music={musicDisplay} />}
          {mode === "aiProgress" && <AiProgressHub task={aiDisplay} />}
          {mode === "download" && <DownloadHub task={downloadDisplay} />}
          {mode === "notification" && <NotificationHub notification={notificationDisplay} />}
          {mode === "multiTask" && <MultiTaskHub tasks={multiTaskDisplay} />}
        </motion.div>
      </AnimatePresence>
    </GlassPanel>
  );
}
