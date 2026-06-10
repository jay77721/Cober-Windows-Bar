# Cober Windows Bar — 开发路线图

## 一、现状评估

### 项目成熟度：v0.7 ~ v0.8

Cober Windows Bar 是一个基于 Tauri 2 + React 19 + TypeScript 的 Windows 桌面状态中心应用。当前版本已完成 7 个阶段的开发，具备完整的 UI 框架和部分真实数据接入。

### 已完成的能力

| 能力 | 状态 | 说明 |
|------|------|------|
| 系统性能监控 (CPU/内存/网络) | ✅ 真实数据 | 通过 `sysinfo` crate 实时采集 |
| Windows 媒体会话 | ✅ 真实数据 | 通过 WinRT GSMTC API 获取播放状态 |
| 窗口浮动/置顶 | ✅ 完整 | Win32 API 控制 z-order |
| 全屏避让 | ✅ 完整 | Win32 `GetForegroundWindow` + 显示器检测 |
| 多显示器支持 | ✅ 完整 | 自动边界修正和 DPI 适配 |
| 系统托盘 | ✅ 完整 | 托盘图标 + 原生右键菜单 |
| 全局快捷键 | ✅ 完整 | `Alt+Shift+Space` 呼出/隐藏 |
| 窗口拖拽 | ✅ 完整 | 指针按下 → 原生拖拽 |
| 偏好设置持久化 | ✅ 完整 | JSON 文件存储 |
| 6 种状态模板 UI | ✅ UI 完整 | 常驻/媒体/下载/更新/剪贴板/专注 |
| Provider SDK 架构 | ✅ 框架就绪 | Registry + Adapter + Lifecycle |
| Showcase 演示页 | ✅ 完整 | 12 个交互演示组件 |

### 核心问题

1. **6 个状态模板中有 4 个使用硬编码 Mock 数据**（下载、更新、剪贴板、专注），仅常驻态和媒体态接入了真实数据
2. **产品表面纯展示，无交互操作** — 用户无法从状态胶囊上直接控制播放、暂停下载等
3. **`DesktopPage.tsx` 是 760 行的巨型组件**，包含 8 个 `useEffect`，承载了所有业务逻辑
4. **Rust 后端 `get_system_performance` 使用同步阻塞** (`thread::sleep`)，占用 Tauri 命令线程
5. **无 i18n 支持** — 所有用户界面文本硬编码为中文
6. **无自动启动** — 作为桌面常驻工具，缺少开机自启能力
7. **Update Provider 虚假声明** — Rust 端声称 `update` 能力为 `app-owned/available`，但实际无实现

---

## 二、开发阶段规划

### 阶段 8：DesktopPage 解耦与架构加固（预估 2-3 天）

**目标**：将 760 行的巨型组件拆分为可维护的 hooks 和子组件。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 提取 `useSystemPerformance` hook | 封装 `loadSystemPerformanceStatus` 轮询逻辑、diagnostic 状态管理 | P0 |
| 提取 `useOverlayPolicy` hook | 封装 overlay policy 轮询、全屏检测、浮动控制 | P0 |
| 提取 `useDesktopStatusRuntime` hook | 封装 runtime 创建、订阅、refresh 逻辑 | P0 |
| 提取 `usePreferences` hook | 封装偏好设置的读取、更新、Tauri 同步 | P1 |
| 提取 `SettingsPanel` 组件 | 将设置面板 UI 独立为子组件 | P1 |
| 修复 render 中的 ref 变更 | `activatedAtByKindRef` 和 `previousResolvedKindRef` 在 render 中直接变更，应移入 `useEffect` 或 `useMemo` | P1 |
| 消除重复的 `dedupeKinds` | 3 处独立定义合并到 `shared/` 工具模块 | P2 |

**验证标准**：所有现有测试通过，QA showcase 交互测试通过，无功能回退。

---

### 阶段 9：剪贴板监控 — 第一个真实数据 Provider（预估 3-4 天）

**目标**：实现第一个新的真实数据 Provider，验证 Provider SDK 端到端流程。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| Rust: 实现 `get_clipboard_content` 命令 | 使用 `windows-sys` 的 `GetClipboardData` 或 `arboard` crate 读取剪贴板 | P0 |
| Rust: 实现剪贴板变更监听 | `AddClipboardFormatListener` + Tauri event 推送到前端 | P0 |
| 前端: 实现 `ClipboardProvider` | 实现 `HubProvider` 接口，注册到 `ProviderRegistry` | P0 |
| 前端: 连接 Provider 到 EventBus | 通过 `connectProviderToEventBus` adapter 接入 | P0 |
| 前端: 剪贴板历史（最近 5 条） | 扩展剪贴板模板，支持展示最近复制记录 | P1 |
| Rust: 注册 `clipboard-manager` 能力 | 更新 `capabilities/default.json` | P1 |

**验证标准**：复制文字后，状态胶囊自动切换到剪贴板态并显示复制内容。

---

### 阶段 10：交互能力 — 从"展示"到"可操作"（预估 3-4 天）

**目标**：让状态胶囊支持用户交互，而不仅仅是只读展示。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 媒体态: 播放控制 | 在媒体模板上添加播放/暂停/上一首/下一首按钮，调用 Rust `media_session` 控制 API | P0 |
| 下载态: 暂停/取消 | 下载模板添加暂停和取消操作（依赖阶段 9 的真实下载 Provider） | P1 |
| 更新态: 操作按钮 | "查看详情"、"稍后提醒" 按钮 | P2 |
| 剪贴板态: 点击复制 | 点击胶囊直接复制内容到剪贴板 | P1 |
| 通用: 点击展开详情 | 点击胶囊展开为更详细的面板视图 | P2 |

**验证标准**：用户可以在状态胶囊上直接控制媒体播放，点击可交互。

---

### 阶段 11：Rust 后端异步化与性能优化（预估 2-3 天）

**目标**：消除阻塞式 IPC 调用，提升响应性和稳定性。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| `get_system_performance` 异步化 | 用 `tokio::spawn_blocking` 或异步 `sysinfo` 替代 `thread::sleep` | P0 |
| 实现 Rust 端定时事件推送 | 用 Rust timer 定期 emit 系统性能事件，替代前端 1.8s 轮询 | P1 |
| 网络利用率计算修正 | 基于实际网卡速率计算百分比，而非硬编码 1.25MB 阈值 | P1 |
| 修复 Update Provider 虚假声明 | 将 `update` 的 quality 改为 `unavailable`，直到真正实现 | P0 |
| 添加 Release 模式日志 | 在 release build 中启用关键路径日志（写入文件而非 console） | P2 |

**验证标准**：`get_system_performance` 不再阻塞 Tauri 命令线程；网络利用率数值合理。

---

### 阶段 12：更多真实 Provider 接入（预估 5-7 天）

**目标**：将更多 Mock 数据替换为真实数据源。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| Windows 通知监听 | 使用 `windows-rs` 的 `UserNotificationListener` API 捕获系统通知 | P0 |
| Focus Assist 状态检测 | 读取 Windows 专注助手状态（注册表 / WinRT） | P1 |
| 下载监控 — 浏览器扩展桥接 | 通过 Native Messaging 或 WebSocket 从浏览器扩展获取下载进度 | P2 |
| 下载监控 — 文件系统监控 | 使用 `notify` crate 监控 Downloads 目录变化作为降级方案 | P2 |
| 系统更新检测 | 通过 Windows Update API (`IUpdateSession`) 检查待安装更新 | P2 |

**验证标准**：至少 4 个状态模板使用真实数据（当前 2 个）。

---

### 阶段 13：i18n 国际化（预估 2-3 天）

**目标**：建立多语言支持体系，首先支持中/英双语。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 引入 `react-i18next` 或 `react-intl` | 选择并集成 i18n 框架 | P0 |
| 抽取所有 UI 文案 | 将 `desktopStatusConfig.ts` 中所有硬编码中文迁移到 locale 文件 | P0 |
| 创建 `en.json` 和 `zh-CN.json` | 英文和简体中文翻译 | P0 |
| Rust 端菜单文案国际化 | 根据系统 locale 动态生成菜单文本 | P1 |
| 语言切换 UI | 在设置面板中添加语言切换选项 | P1 |
| Showcase 页面统一语言 | Showcase 目前全英文，Product 页面全中文 — 统一 | P2 |

**验证标准**：切换语言后所有 UI 文本即时更新，无需重启。

---

### 阶段 14：自动启动与系统集成（预估 1-2 天）

**目标**：实现桌面常驻工具的基础运维能力。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 开机自启 | 集成 `tauri-plugin-autostart`，支持设置中开关 | P0 |
| 自动更新 | 集成 `tauri-plugin-updater`，支持 GitHub Release 分发 | P1 |
| 托盘 "最小化到托盘" 反馈 | 关闭窗口时显示短暂 toast 提示 "已最小化到托盘" | P2 |
| 细粒度 Tauri 权限 | 替换 `core:default` 为精确的权限声明 | P2 |

---

### 阶段 15：多状态同时展示（预估 3-4 天）

**目标**：从单模板切换模式升级为多模板同时展示。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 胶囊扩展布局 | 多个活跃状态时，胶囊水平展开显示多个指示器 | P0 |
| 动态宽度适配 | 窗口宽度根据活跃状态数量自适应（315px → 最大 ~600px） | P0 |
| 优先级排序展示 | 按优先级排序显示，最重要的在最左 | P1 |
| 点击切换焦点 | 点击某个指示器展开其详细视图 | P1 |
| Showcase MultiTask 视图对齐 | 确保 showcase 的 MultiTask 演示与产品行为一致 | P2 |

---

### 阶段 16：测试体系建设（预估 2-3 天）

**目标**：补齐测试覆盖短板，建立可持续的质量保障体系。

| 任务 | 详情 | 优先级 |
|------|------|--------|
| 引入 Vitest | 替换自定义 test runner，获得 isolation、watch mode、coverage | P0 |
| React 组件测试 | 为每个状态模板组件编写渲染测试 | P1 |
| `DesktopPage` 集成测试 | 测试核心 hook 交互（mock Tauri invoke） | P1 |
| E2E 测试扩展 | 扩展 Playwright 测试覆盖更多交互场景 | P2 |
| CI 配置 | GitHub Actions 自动化测试 + 构建 | P2 |

---

## 三、优先级排序总览

```
紧急且重要（立即执行）:
  阶段 8  — DesktopPage 解耦         ← 为后续所有开发打好基础
  阶段 11 — Rust 异步化              ← 修复性能和虚假声明问题

重要但不紧急（核心功能）:
  阶段 9  — 剪贴板 Provider          ← 验证 Provider SDK 端到端
  阶段 10 — 交互能力                 ← 从展示品变为可用产品
  阶段 12 — 更多真实 Provider        ← 逐步替换 mock 数据

基础设施（持续进行）:
  阶段 13 — i18n 国际化              ← 扩大用户群
  阶段 14 — 自动启动与系统集成       ← 桌面常驻必备
  阶段 16 — 测试体系建设             ← 保障质量

锦上添花（远期）:
  阶段 15 — 多状态同时展示           ← 重大 UX 升级
```

---

## 四、技术债务清单

以下是当前代码中已识别的技术债务，建议在对应阶段中顺手清理：

| 债务 | 位置 | 建议 |
|------|------|------|
| `DesktopStatusTransition.tsx` 未使用 | `src/features/desktop/templates/` | 启用或移除 |
| `dedupeKinds` 函数重复定义 3 处 | `desktopStatusAggregation.ts`, `desktopStatusScheduler.ts` | 提取到 `shared/` |
| `globals.css` 2386 行单文件 | `src/styles/globals.css` | 按组件拆分，使用 CSS Modules 或 `@import` |
| `vite.config.ts` 中使用 `any` | `vite.config.ts:10` | 使用正确的 Connect/Express 类型 |
| 无错误边界组件 | `DesktopPage.tsx` | 添加 React Error Boundary 包裹 |
| Mock Provider 无错误模拟 | `mockProviders.ts` | 添加可配置的故障注入用于测试 |

---

## 五、建议执行顺序

```
第 1 周:  阶段 8 (架构解耦) + 阶段 11 (Rust 异步化)
第 2 周:  阶段 9 (剪贴板 Provider) + 阶段 10 (交互能力)
第 3 周:  阶段 12 (更多 Provider) + 阶段 14 (自动启动)
第 4 周:  阶段 13 (i18n) + 阶段 16 (测试体系)
远期:     阶段 15 (多状态展示)
```

预计 **4 周**可达到 v1.0 发布标准：所有 6 个状态模板接入真实数据、支持交互、中英双语、开机自启、完整测试覆盖。
