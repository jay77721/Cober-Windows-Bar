import { strict as assert } from "node:assert";
import {
  DESKTOP_STATUS_PREFERRED_WINDOW_MS,
  DESKTOP_STATUS_PREEMPTION_WINDOW_MS,
  DESKTOP_STATUS_STABILITY_WINDOW_MS,
  getDesktopStatusPriorityOrder,
  scheduleDesktopStatus,
} from "./desktopStatusScheduler";

function test(name: string, run: () => void) {
  run();
  console.log(`ok ${name}`);
}

test("desktop status scheduler falls back to resident by default", () => {
  const decision = scheduleDesktopStatus({
    availableKinds: ["resident", "media", "download", "update", "clipboard", "focus"],
  });

  assert.equal(decision.kind, "resident");
  assert.equal(decision.reason, "fallback");
  assert.equal(decision.changed, true);
});

test("desktop status scheduler uses configured priority when multiple kinds are active", () => {
  const decision = scheduleDesktopStatus({
    activeKinds: ["clipboard", "media", "focus"],
    availableKinds: ["resident", "media", "download", "update", "clipboard", "focus"],
  });

  assert.equal(decision.kind, "focus");
  assert.equal(decision.reason, "priority");
  assert.equal(decision.changed, true);
});

test("desktop status scheduler lets preferred kind override priority", () => {
  const now = 32_000;
  const decision = scheduleDesktopStatus({
    now,
    preferredKind: "media",
    preferredUntil: now,
    activeKinds: ["focus", "update"],
    availableKinds: ["resident", "media", "download", "update", "clipboard", "focus"],
  });

  assert.equal(decision.kind, "media");
  assert.equal(decision.reason, "preferred");
  assert.equal(decision.changed, true);
});

test("desktop status scheduler safely falls back when inputs are missing or unknown", () => {
  const decision = scheduleDesktopStatus({
    activeKinds: ["focus"],
    availableKinds: ["resident"],
  });

  assert.equal(decision.kind, "resident");
  assert.equal(decision.reason, "fallback");
  assert.equal(decision.changed, true);
});

test("desktop status priority order is exposed for higher-level resolvers", () => {
  assert.deepEqual(getDesktopStatusPriorityOrder(), [
    "focus",
    "update",
    "download",
    "media",
    "clipboard",
    "resident",
  ]);
});

test("desktop status scheduler keeps the previous active kind within the stability window", () => {
  const now = 50_000;
  const decision = scheduleDesktopStatus({
    now,
    previousKind: "media",
    previousChangedAt: now - 1_200,
    activeKinds: ["media", "clipboard"],
    availableKinds: ["resident", "media", "clipboard"],
    activatedAtByKind: {
      media: now - 2_000,
      clipboard: now - 500,
    },
  });

  assert.equal(decision.kind, "media");
  assert.equal(decision.reason, "priority");
  assert.equal(decision.changed, false);
});

test("desktop status scheduler allows a newly activated higher-priority kind to preempt within the preemption window", () => {
  const now = 80_000;
  const decision = scheduleDesktopStatus({
    now,
    previousKind: "download",
    previousChangedAt: now - 1_000,
    activeKinds: ["download", "focus"],
    availableKinds: ["resident", "download", "focus"],
    activatedAtByKind: {
      download: now - 5_000,
      focus: now - (DESKTOP_STATUS_PREEMPTION_WINDOW_MS - 1_000),
    },
  });

  assert.equal(decision.kind, "focus");
  assert.equal(decision.reason, "priority");
  assert.equal(decision.changed, true);
});

test("desktop status scheduler keeps a manual preference only inside the preferred window", () => {
  const now = 120_000;
  const pinnedDecision = scheduleDesktopStatus({
    now,
    preferredKind: "media",
    preferredUntil: now,
    activeKinds: ["focus"],
    availableKinds: ["resident", "media", "focus"],
  });

  assert.equal(pinnedDecision.kind, "media");
  assert.equal(pinnedDecision.reason, "preferred");
  assert.equal(pinnedDecision.changed, true);

  const expiredDecision = scheduleDesktopStatus({
    now,
    preferredKind: "media",
    preferredUntil: now - DESKTOP_STATUS_PREFERRED_WINDOW_MS * 4 - 1,
    activeKinds: ["focus"],
    availableKinds: ["resident", "media", "focus"],
  });

  assert.equal(expiredDecision.kind, "focus");
  assert.equal(expiredDecision.reason, "priority");
  assert.equal(expiredDecision.changed, true);
});
