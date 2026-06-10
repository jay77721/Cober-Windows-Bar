# Repository Guide

This document is the shortest path for a new contributor to understand how the repository is organized.

## Read Order

If you are new here:

1. [README](../README.md)
2. [Architecture](architecture/ARCHITECTURE.md)
3. [Roadmap](product/ROADMAP.md)
4. [Contributing](../CONTRIBUTING.md)

## Folder Map

### `src/`

Application source code.

- `features/desktop/`
  desktop product surface

- `features/showcase/`
  showcase and demo surface

- `shared/ui/`
  reusable UI primitives

- `runtime/`
  frontend runtime boundary and desktop behavior logic

- `providers/`
  provider contracts, mocks, adapters, and registries

- `state/`
  event bus and state logic

- `data/`
  mock data and desktop configuration

- `types/`
  shared domain types

- `styles/`
  global styling

### `src-tauri/`

Native Tauri/Rust application shell.

- `src/lib.rs`
  native commands and window behavior helpers

### `scripts/`

Local developer helpers.

- `desktop-mock.ps1`
  launches the desktop mock shell

- `qa-showcase-interactions.mjs`
  repeatable showcase interaction QA

### `docs/`

Project documentation grouped by purpose.

- `architecture/`
  codebase and runtime shape

- `product/`
  product goals, roadmap, UI direction

- `providers/`
  provider model and provider plans

- `qa/`
  QA and testing guidance

- `plans/`
  active implementation plans

- `decisions/`
  current decision records

- `archive/`
  historical reports and frozen records

## Fast Paths By Task

### I want to understand current v0.8 system status readiness

Start here:

- [System status gate completion decision](decisions/v0.8_SYSTEM_STATUS_GATE_COMPLETION_DECISION.md)
- [First provider candidate decision](decisions/v0.8_FIRST_PROVIDER_CANDIDATE_DECISION.md)
- [System status privacy checklist](decisions/v0.8_SYSTEM_STATUS_PRIVACY_CHECKLIST.md)
- `src/runtime/systemPerformanceRuntime.ts`
- `src/runtime/systemPerformanceRuntime.test.ts`

Current boundary: v0.8 system status work has moved beyond preflight. The Tauri Rust backend now provides real system performance data (CPU/RAM/network via sysinfo crate) and real media session tracking (via Windows GSMTC). The remaining v0.8 work focuses on wrapping these data sources into the Provider SDK lifecycle and adding the remaining native providers (focus, clipboard, downloads, notifications).

### I want to work on the desktop status center

Start here:

- `src/features/desktop/DesktopPage.tsx`
- `src/features/desktop/components/ResidentPerformanceHub.tsx`
- `src/runtime/statusWindowRuntime.ts`
- `src-tauri/src/lib.rs`

### I want to work on showcase behavior

Start here:

- `src/features/showcase/ShowcasePage.tsx`
- `src/features/showcase/components/`
- `src/state/`
- `src/providers/`

### I want to work on runtime or native boundaries

Start here:

- `src/runtime/`
- `src-tauri/src/lib.rs`
- `src/types/hub.ts`

### I want to understand the product intent

Read:

- [PRD](product/PRD.md)
- [UI Spec](product/UI_SPEC.md)
- [Roadmap](product/ROADMAP.md)

## Current Truth

For current project structure, trust:

- `README.md`
- `CONTRIBUTING.md`
- this file
- active docs outside `archive/`

Files under `docs/archive/` are historical context only.
