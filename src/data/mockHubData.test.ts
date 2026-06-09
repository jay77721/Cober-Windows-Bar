import { strict as assert } from "node:assert";
import { systemPerformanceMetrics } from "./mockHubData";

const metricLabels = Object.fromEntries(
  systemPerformanceMetrics.map((metric) => [metric.id, metric.label]),
);

assert.equal(metricLabels.cpu, "CPU");
assert.equal(metricLabels.memory, "内存");
assert.equal(metricLabels.network, "网络");

for (const label of Object.values(metricLabels)) {
  assert.equal(/[�鍐缃褰鐜浣敤墠]/.test(label), false, `${label} must not be mojibake`);
}

console.log("ok system performance labels stay readable");
