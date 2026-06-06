import type { HubTask, MusicState, NotificationState, ShowcaseStep } from "../types/hub";

export const musicState: MusicState = {
  title: "星穹铁道 OST",
  subtitle: "Hope Is the Thing",
  time: "02:35 / 04:32",
  progress: 56,
};

export const aiTask: HubTask = {
  id: "ai-gpt",
  type: "ai",
  title: "GPT-5.5",
  subtitle: "正在生成代码...",
  progress: 68,
  accent: "blue",
};

export const downloadTask: HubTask = {
  id: "download-ubuntu",
  type: "download",
  title: "Ubuntu.iso",
  subtitle: "2.3GB / 4.8GB",
  progress: 48,
  accent: "green",
};

export const notificationState: NotificationState = {
  app: "微信",
  sender: "张三",
  message: "晚上打CS2吗?",
};

export const multiTasks: HubTask[] = [
  {
    id: "music-ost",
    type: "music",
    title: musicState.title,
    subtitle: musicState.time,
    progress: musicState.progress,
    accent: "pink",
  },
  aiTask,
  downloadTask,
];

export const showcaseSteps: ShowcaseStep[] = [
  { id: "idle", mode: "idle", label: "1. 空闲状态", caption: "收缩" },
  { id: "music", mode: "music", label: "2. 音乐播放中", caption: "媒体控制" },
  { id: "ai", mode: "aiProgress", label: "3. AI 任务进行中", caption: "进度反馈" },
  { id: "download", mode: "download", label: "4. 下载进行中", caption: "文件进度" },
  { id: "notification", mode: "notification", label: "5. 收到消息通知", caption: "3秒后自动收起" },
  { id: "multi", mode: "multiTask", label: "6. 多任务堆叠", caption: "展开" },
];
