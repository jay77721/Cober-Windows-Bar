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
  const state = resolveDesktopStatusState({ metrics, preferredKind: "media" });

  assert.equal(state.kind, "media");
  assert.equal(state.title, "Neon Focus");
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
