import { strict as assert } from "node:assert";
import {
  createDebouncedWindowCorrection,
  createStatusWindowOverlayState,
  enforceStatusWindowOverlay,
  parseOverlayPolicy,
  scheduleOverlayStartupReassert,
  STATUS_WINDOW_FLOATING_COMMAND,
  STATUS_WINDOW_OVERLAY_POLICY_COMMAND,
  type StatusWindowOverlayState,
} from "./statusWindowRuntime";
import type { TauriInvoke } from "./tauriRuntime";

const tests: Array<{ name: string; run: () => void | Promise<void> }> = [];

function test(name: string, run: () => void | Promise<void>) {
  tests.push({ name, run });
}

function invokeWithPolicy(policy: unknown, calls: Array<{ command: string; args?: Record<string, unknown> }>): TauriInvoke {
  return async (command, args) => {
    calls.push({ command, args });

    if (command === STATUS_WINDOW_OVERLAY_POLICY_COMMAND) {
      return policy;
    }

    return undefined;
  };
}

test("parses current overlay policy payload", () => {
  assert.deepEqual(
    parseOverlayPolicy({ foregroundFullscreen: true, shouldFloat: false }),
    { foregroundFullscreen: true, shouldFloat: false },
  );
});

test("keeps legacy shouldFloat-only overlay payload usable", () => {
  assert.deepEqual(parseOverlayPolicy({ shouldFloat: true }), {
    foregroundFullscreen: false,
    shouldFloat: true,
  });
});

test("rejects malformed overlay policy payloads", () => {
  assert.equal(parseOverlayPolicy(null), undefined);
  assert.equal(parseOverlayPolicy({ shouldFloat: "yes" }), undefined);
});

test("applies floating on the first non-fullscreen policy", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const state = createStatusWindowOverlayState();

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: false, shouldFloat: true }, calls),
    now: 100,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(calls.map((call) => call.command), [
    STATUS_WINDOW_OVERLAY_POLICY_COMMAND,
    STATUS_WINDOW_FLOATING_COMMAND,
  ]);
  assert.deepEqual(calls[1]?.args, { floating: true });
  assert.equal(state.appliedFloating, true);
  assert.equal(state.lastFloatingAppliedAt, 100);
  assert.equal(state.mode, "floating");
});

test("reasserts topmost after the refresh interval", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const state: StatusWindowOverlayState = {
    appliedFloating: true,
    lastFloatingAppliedAt: 100,
    lastPositionCorrectionAt: 0,
    mode: "floating",
    startupReassertPendingAt: [],
  };

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: false, shouldFloat: true }, calls),
    now: 2000,
    topmostReassertMs: 1800,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(calls.map((call) => call.command), [
    STATUS_WINDOW_OVERLAY_POLICY_COMMAND,
    STATUS_WINDOW_FLOATING_COMMAND,
  ]);
  assert.deepEqual(calls[1]?.args, { floating: true });
  assert.equal(state.lastFloatingAppliedAt, 2000);
});

test("does not reassert topmost before the refresh interval", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const state: StatusWindowOverlayState = {
    appliedFloating: true,
    lastFloatingAppliedAt: 100,
    lastPositionCorrectionAt: 0,
    mode: "floating",
    startupReassertPendingAt: [],
  };

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: false, shouldFloat: true }, calls),
    now: 1000,
    topmostReassertMs: 1800,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(calls.map((call) => call.command), [STATUS_WINDOW_OVERLAY_POLICY_COMMAND]);
});

test("releases topmost when the foreground app is fullscreen", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const state: StatusWindowOverlayState = {
    appliedFloating: true,
    lastFloatingAppliedAt: 100,
    lastPositionCorrectionAt: 0,
    mode: "floating",
    startupReassertPendingAt: [],
  };

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: true, shouldFloat: false }, calls),
    now: 700,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(calls.map((call) => call.command), [
    STATUS_WINDOW_OVERLAY_POLICY_COMMAND,
    STATUS_WINDOW_FLOATING_COMMAND,
  ]);
  assert.deepEqual(calls[1]?.args, { floating: false });
  assert.equal(state.appliedFloating, false);
  assert.equal(state.mode, "suppressed_for_fullscreen");
});

test("startup reasserts force a floating refresh at scheduled checkpoints", async () => {
  const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const state = createStatusWindowOverlayState();

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: false, shouldFloat: true }, calls),
    now: 100,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  calls.length = 0;

  await enforceStatusWindowOverlay(state, {
    invoke: invokeWithPolicy({ foregroundFullscreen: false, shouldFloat: true }, calls),
    now: 1200,
    topmostReassertMs: Number.POSITIVE_INFINITY,
    positionCorrectionMs: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(calls.map((call) => call.command), [
    STATUS_WINDOW_OVERLAY_POLICY_COMMAND,
    STATUS_WINDOW_FLOATING_COMMAND,
  ]);
});

test("startup reassert schedule can be reset explicitly", () => {
  const state = createStatusWindowOverlayState();
  state.startupReassertPendingAt = [];
  state.mode = "floating";
  state.appliedFloating = true;

  scheduleOverlayStartupReassert(state);

  assert.equal(state.mode, "restoring");
  assert.equal(state.appliedFloating, null);
  assert.equal(state.startupReassertPendingAt.length > 0, true);
});

test("debounced correction collapses repeated triggers", async () => {
  let callCount = 0;
  const restoreWindow = globalThis.window;
  const timers = new Map<number, () => void>();
  let nextTimerId = 1;

  (globalThis as typeof globalThis & {
    window: {
      setTimeout: (handler: () => void, timeout?: number) => number;
      clearTimeout: (id: number) => void;
    };
  }).window = {
    setTimeout(handler) {
      const id = nextTimerId++;
      timers.set(id, handler);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };

  try {
    const debounced = createDebouncedWindowCorrection(async () => {
      callCount += 1;
    }, 100);

    debounced.trigger();
    debounced.trigger();
    debounced.trigger();

    assert.equal(timers.size, 1);
    timers.values().next().value?.();
    await Promise.resolve();
    assert.equal(callCount, 1);
  } finally {
    (globalThis as typeof globalThis & { window: typeof window }).window = restoreWindow;
  }
});

for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`not ok ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}
