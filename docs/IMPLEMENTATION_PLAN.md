# Cober-Windows-Bar Implementation Plan

## 1. 当前阶段

当前阶段是 UI-only prototype。目标是先做出可运行、可展示、可截图的前端页面。

## 2. 技术栈

- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- lucide-react

## 3. 目录结构

```text
src/
├─ App.tsx
├─ main.tsx
├─ styles/
│  └─ globals.css
├─ components/
│  ├─ hub/
│  ├─ showcase/
│  └─ ui/
├─ data/
│  └─ mockHubData.ts
└─ types/
   └─ hub.ts
```

## 4. 开发顺序

1. 初始化 Vite React TypeScript 项目。
2. 配置 TailwindCSS、Framer Motion、lucide-react。
3. 定义 Hub 类型。
4. 编写 Mock 数据。
5. 实现通用 UI 组件。
6. 实现六种 Hub 状态组件。
7. 实现 Showcase 页面组件。
8. 添加点击切换状态。
9. 构建验证。
10. 浏览器视觉 QA。

## 5. 组件职责

### hub

核心状态栏组件：

- `HubShell`
- `IdleHub`
- `MusicHub`
- `AiProgressHub`
- `DownloadHub`
- `NotificationHub`
- `MultiTaskHub`

### showcase

展示页面组件：

- `ModeSidebar`
- `StatusFlow`
- `TaskbarFusionDemo`
- `FluentStyleGuide`

### ui

通用基础组件：

- `GlassPanel`
- `ProgressBar`
- `StatusIcon`

## 6. 测试计划

### Build

```bash
npm run build
```

### Visual QA

检查：

- Idle 状态
- Music 状态
- AI Progress 状态
- Download 状态
- Notification 状态
- Multi Task 状态
- 1366、1440、1920 宽度
- 文字截断
- 卡片阴影
- 进度条位置
- 动画是否自然

## 7. 下一步

UI 原型稳定后，再进入 Phase 1：Mock Event Bus 和状态解析系统。不要提前加入 Tauri 或真实 Provider，以免影响当前 UI 验证节奏。
