import { strict as assert } from "node:assert";
import { createSystemPerformanceMetricSnapshot } from "../data/desktopStatusConfig";
import { createDesktopStatusStateMap, listDesktopStatusStates, resolveDesktopStatusState } from "./desktopStatusState";

const metrics = createSystemPerformanceMetricSnapshot({
  cpu: 23,
  memory: 68,
  network: 56,
});

function test(name: string, run: () => void) {
  run();
  console.log(`ok ${name}`);
}

test("desktop status resolver defaults to resident state", () => {
  const state = resolveDesktopStatusState({ metrics });

  assert.equal(state.kind, "resident");
  assert.equal(state.metrics.length, 3);
});

test("desktop status resolver can switch to another explicit state kind", () => {
  const now = 48_000;
  const state = resolveDesktopStatusState({ metrics, preferredKind: "media", preferredUntil: now, now });

  assert.equal(state.kind, "media");
  assert.equal(state.title, "Neon Focus");
});

test("desktop status resolver uses priority when multiple active kinds are present", () => {
  const state = resolveDesktopStatusState({
    metrics,
    activeKinds: ["clipboard", "update", "media"],
  });

  assert.equal(state.kind, "update");
});

test("desktop status resolver safely falls back to resident when preferred kind is unavailable", () => {
  const state = resolveDesktopStatusState({
    metrics,
    preferredKind: "focus",
    activeKinds: ["focus"],
    availableKinds: ["resident"],
    states: {
      resident: {
        kind: "resident",
        title: "系统性能",
        subtitle: "常驻状态中心",
        source: "system",
        metrics,
      },
    },
  });

  assert.equal(state.kind, "resident");
});

test("desktop status state map snapshots metrics instead of leaking caller references", () => {
  const stateMap = createDesktopStatusStateMap(metrics);

  stateMap.resident.metrics[0]!.label = "Mutated";
  assert.equal(metrics[0]!.label, "CPU");
});

test("desktop status state listing exposes all six status templates in product order", () => {
  assert.deepEqual(
    listDesktopStatusStates(metrics).map((state) => state.kind),
    ["resident", "media", "download", "update", "clipboard", "focus"],
  );
});

test("desktop status resolver keeps the previous state during the stability window", () => {
  const now = 96_000;
  const state = resolveDesktopStatusState({
    metrics,
    now,
    previousKind: "media",
    previousChangedAt: now - 1_000,
    activeKinds: ["media", "clipboard"],
    availableKinds: ["resident", "media", "clipboard"],
    activatedAtByKind: {
      media: now - 3_000,
      clipboard: now - 400,
    },
  });

  assert.equal(state.kind, "media");
});
