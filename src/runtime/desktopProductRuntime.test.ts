import { strict as assert } from "node:assert";
import {
  parseStatusCenterMenuActionPayload,
  parseStatusCenterOpenSettingsPayload,
  parseStatusCenterSettingsPayload,
} from "./desktopProductRuntime";

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

test("normalizes legacy menu action ids to canonical toggle actions", () => {
  assert.deepEqual(
    parseStatusCenterMenuActionPayload({
      action: "always-float",
      checked: false,
    }),
    {
      action: "toggle-always-float",
      checked: false,
    },
  );

  assert.deepEqual(
    parseStatusCenterMenuActionPayload({
      action: "avoid-fullscreen",
      checked: true,
    }),
    {
      action: "toggle-avoid-fullscreen",
      checked: true,
    },
  );
});

test("rejects malformed menu payloads", () => {
  assert.equal(parseStatusCenterMenuActionPayload(null), undefined);
  assert.equal(parseStatusCenterMenuActionPayload({ action: "bad-action" }), undefined);
});

test("accepts canonical status center settings payloads", () => {
  assert.deepEqual(
    parseStatusCenterSettingsPayload({
      preferences: {
        alwaysFloat: true,
        avoidFullscreen: false,
        lockPosition: true,
      },
    }),
    {
      preferences: {
        alwaysFloat: true,
        avoidFullscreen: false,
        lockPosition: true,
      },
    },
  );
});

test("clones settings payloads before returning them", () => {
  const input = {
    preferences: {
      alwaysFloat: true,
      avoidFullscreen: false,
      lockPosition: true,
    },
  };

  const parsed = parseStatusCenterSettingsPayload(input);
  assert.notEqual(parsed, input);
  assert.notEqual(parsed?.preferences, input.preferences);
});

test("accepts canonical open-settings payloads", () => {
  assert.deepEqual(parseStatusCenterOpenSettingsPayload({ source: "menu" }), { source: "menu" });
  assert.deepEqual(parseStatusCenterOpenSettingsPayload({ source: "tray" }), { source: "tray" });
  assert.deepEqual(parseStatusCenterOpenSettingsPayload({ source: "invoke" }), { source: "invoke" });
});

test("rejects malformed open-settings payloads", () => {
  assert.equal(parseStatusCenterOpenSettingsPayload(null), undefined);
  assert.equal(parseStatusCenterOpenSettingsPayload({ source: "bad" }), undefined);
});

test("rejects malformed status center settings payloads", () => {
  assert.equal(parseStatusCenterSettingsPayload(null), undefined);
  assert.equal(parseStatusCenterSettingsPayload({ preferences: { alwaysFloat: true } }), undefined);
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
