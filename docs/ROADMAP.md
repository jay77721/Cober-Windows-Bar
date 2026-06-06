# Cober-Windows-Bar Roadmap

## Phase 0: UI Prototype

目标：完成可运行的 React UI 展示页。

内容：

- 六种状态卡片
- 展示页面
- Mock 数据
- Fluent 风格
- 基础动画

## Phase 1: Mock State System

目标：从静态展示升级为 Mock 事件驱动。

内容：

- HubEvent 类型
- Event Bus
- Store
- Mode Resolver
- 事件过期清理
- 自动进入 Notification / Multi Task 等模式

## Phase 2: Tauri Desktop Shell

目标：把 UI 放进 Windows 桌面悬浮窗。

内容：

- Tauri 2
- 透明窗口
- 无边框
- 始终置顶
- 右下角任务栏上方 10px 停靠
- 多显示器处理

## Phase 3: Real Providers

目标：逐步接入真实数据。

优先级：

1. System Provider：CPU、RAM、网络、电池
2. Download Provider：监听 Downloads 文件夹
3. Music Provider：Windows Media Session API
4. AI Provider：本地事件接口优先

## Phase 4: Ecosystem Providers

目标：扩展为开发者和效率工具状态中心。

候选方向：

- Git 状态
- Docker 状态
- WSL 状态
- Maven / Gradle 构建状态
- 系统通知聚合
- Codex / Claude / Gemini / OpenAI 状态

## Product Principle

视觉完成度优先于功能数量。每个新增 Provider 都必须服务于“低打扰、一眼扫过、像系统原生功能”的核心体验。
