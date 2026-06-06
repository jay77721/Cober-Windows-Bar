# Cober-Windows-Bar 产品需求文档

## 1. 产品定位

Cober-Windows-Bar 是一个 Windows 11 Fluent Design 风格的智能状态悬浮栏。它位于屏幕右下角任务栏上方，用紧凑、优雅、低打扰的方式展示正在进行的任务和重要通知。

当前版本只做 UI 原型，目标是先验证视觉方向和核心交互是否成立。

## 2. 目标用户

- Windows 11 重度用户
- AI 工具用户
- 开发者
- 喜欢桌面效率工具、小组件和状态监控产品的用户

## 3. 核心价值

- 把音乐、AI 生成、下载、通知等分散状态聚合到一个轻量浮层中。
- 以 Windows 11 官方系统浮层的视觉标准呈现状态。
- 为后续 Tauri 桌面壳和真实 Provider 架构打基础。

## 4. MVP 范围

首版必须完成：

- Idle 收缩状态
- Music 播放状态
- AI Progress 状态
- Download 状态
- Notification 状态
- Multi Task 状态
- 展示页面布局
- Mock 数据
- Fluent / Acrylic / Mica 视觉表现

首版不做：

- Tauri 桌面壳
- 透明原生窗口
- Rust Provider
- 真实系统数据
- 微信、QQ、Discord 内容抓取
- Chrome CDP
- 设置页

## 5. 展示模式

### Idle

默认收缩胶囊，展示音乐、AI、下载三个图标。

### Music

展示歌曲名、来源、进度、当前时间和基础控制按钮。

### AI Progress

展示 AI 名称、任务状态、进度条和百分比。

### Download

展示文件名、已下载大小、总大小、进度条和百分比。

### Notification

展示应用名、联系人和消息内容。UI 原型中模拟 3 秒后自动收起。

### Multi Task

多任务同时存在时展开为三行堆叠，最多展示音乐、AI、下载三个任务。

## 6. 成功标准

- 第一眼看起来接近 Windows 11 官方系统组件。
- 六种状态都能独立展示。
- 视觉层级清晰，没有文本溢出或组件重叠。
- 动画自然，不出现廉价跳动。
- 页面适合录制 Demo 视频和放到 GitHub 展示。
