import { strict as assert } from "node:assert";
import { loadSystemPerformance } from "./systemPerformanceRuntime";

const tests: Array<{ name: string; run: () => void | Promise<void> }> = [];

function test(name: string, run: () => void | Promise<void>) {
  tests.push({ name, run });
}

test("keeps readable Chinese labels when native system data loads", async () => {
  const metrics = await loadSystemPerformance({
    invoke: async () => ({
      cpu: 17,
      memory: 61,
      network: 42,
    }),
  });

  assert.deepEqual(
    metrics.map((metric) => ({ id: metric.id, label: metric.label, value: metric.value })),
    [
      { id: "cpu", label: "CPU", value: 17 },
      { id: "memory", label: "内存", value: 61 },
      { id: "network", label: "网络", value: 42 },
    ],
  );
});

test("falls back without introducing mojibake when native data is malformed", async () => {
  const metrics = await loadSystemPerformance({
    invoke: async () => ({
      cpu: "bad",
      memory: 61,
      network: 42,
    }),
  });

  for (const label of metrics.map((metric) => metric.label)) {
    assert.equal(/[�]/.test(label), false, `${label} must not be mojibake`);
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
