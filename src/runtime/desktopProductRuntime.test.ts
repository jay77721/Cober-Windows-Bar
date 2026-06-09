import { strict as assert } from "node:assert";
import { parseStatusCenterMenuActionPayload } from "./desktopProductRuntime";

const tests: Array<{ name: string; run: () => void | Promise<void> }> = [];

function test(name: string, run: () => void | Promise<void>) {
  tests.push({ name, run });
}

test("accepts canonical status center menu payloads", () => {
  assert.deepEqual(
    parseStatusCenterMenuActionPayload({
      action: "toggle-always-float",
      checked: true,
    }),
    {
      action: "toggle-always-float",
      checked: true,
    },
  );
});

test("rejects malformed menu payloads", () => {
  assert.equal(parseStatusCenterMenuActionPayload(null), undefined);
  assert.equal(parseStatusCenterMenuActionPayload({ action: "bad-action" }), undefined);
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
