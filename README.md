# Cober-Windows-Bar

Windows 11 Fluent Design 风格的智能状态悬浮栏 UI 原型。

当前阶段：`UI Prototype`

## Overview

Cober-Windows-Bar 目标是做一个看起来像 Windows 11 官方系统功能的 Smart Status Hub。它常驻屏幕右下角任务栏上方，用紧凑、低打扰的方式展示音乐、AI 生成、下载进度和重要通知。

首版只做前端 UI 原型，不接真实系统数据，也不包含 Tauri/Rust 桌面壳。

## Features

- Idle 收缩状态
- Music 播放状态
- AI Progress 任务进度
- Download 下载进度
- Notification 消息通知
- Multi Task 多任务堆叠
- Windows 11 Fluent / Acrylic / Mica 视觉风格
- Mock 数据驱动的展示页面

## Local Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Screenshots

UI 完成后将在这里补充截图。

## Roadmap

- Phase 0: UI showcase prototype
- Phase 1: Mock event bus and state resolver
- Phase 2: Tauri 2 floating desktop shell
- Phase 3: Real providers for system, music, downloads, and AI states
- Phase 4: Ecosystem providers for Git, Docker, WSL, Maven, Gradle, and notifications

## Documentation

- [PRD](docs/PRD.md)
- [UI Spec](docs/UI_SPEC.md)
- [Roadmap](docs/ROADMAP.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## License

MIT
