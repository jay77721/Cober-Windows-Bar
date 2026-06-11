import { strict as assert } from "node:assert";
import i18n from "../i18n";
import {
  createMockAiTaskEvent,
  createMockDownloadEvent,
  createMockMusicEvent,
  createMockNotificationEvent,
} from "../providers/mockProviders";
import { aggregateDesktopStatusInput } from "./desktopStatusAggregation";

const now = Date.UTC(2026, 5, 9, 12, 0, 0);

function test(name: string, run: () => void) {
  run();
  console.log(`ok ${name}`);
}

test("desktop status aggregation safely returns no active kinds without upstream input", () => {
  const result = aggregateDesktopStatusInput();

  assert.deepEqual(result.activeKinds, []);
  assert.equal(result.states, undefined);
  assert.equal(result.availableKinds, undefined);
});

test("desktop status aggregation maps mock music input into media state", () => {
  const result = aggregateDesktopStatusInput({
    events: [createMockMusicEvent({ now })],
    now,
  });

  assert.deepEqual(result.activeKinds, ["media"]);
  assert.equal(result.states?.media?.kind, "media");
  assert.equal(result.states?.media?.title, "Midnight City");
  assert.equal(result.states?.media?.subtitle, i18n.t("aggregation.nowPlaying"));
  assert.equal(result.states?.media?.artist, "M83 - Hurry Up, We're Dreaming");
});

test("desktop status aggregation maps mock download input into download state", () => {
  const result = aggregateDesktopStatusInput({
    events: [createMockDownloadEvent({ now })],
    now,
  });

  assert.deepEqual(result.activeKinds, ["download"]);
  assert.equal(result.states?.download?.kind, "download");
  assert.equal(result.states?.download?.title, "Windows SDK Preview.zip");
  assert.equal(result.states?.download?.subtitle, i18n.t("aggregation.downloadTask"));
  assert.equal(result.states?.download?.detail, "42.8 MB of 96 MB");
});

test("desktop status aggregation maps mock ai task input into update state", () => {
  const result = aggregateDesktopStatusInput({
    events: [createMockAiTaskEvent({ now })],
    now,
  });

  assert.deepEqual(result.activeKinds, ["update"]);
  assert.equal(result.states?.update?.kind, "update");
  assert.equal(result.states?.update?.title, "Codex is updating the provider SDK");
  assert.equal(result.states?.update?.subtitle, i18n.t("aggregation.inProgress"));
});

test("desktop status aggregation keeps multiple active kinds without doing priority resolution", () => {
  const result = aggregateDesktopStatusInput({
    events: [
      createMockMusicEvent({ now }),
      createMockDownloadEvent({ now }),
      createMockAiTaskEvent({ now }),
      createMockNotificationEvent({ now }),
    ],
    now,
  });

  assert.deepEqual(result.activeKinds, ["media", "download", "update", "clipboard"]);
  assert.equal(result.states?.media?.kind, "media");
  assert.equal(result.states?.download?.kind, "download");
  assert.equal(result.states?.update?.kind, "update");
  assert.equal(result.states?.clipboard?.kind, "clipboard");
  assert.equal(result.states?.clipboard?.subtitle, i18n.t("aggregation.recentMessage"));
});

test("desktop status aggregation preserves caller-provided available kinds as scheduler input", () => {
  const result = aggregateDesktopStatusInput({
    events: [createMockMusicEvent({ now })],
    now,
    availableKinds: ["resident", "media", "resident", "focus"],
  });

  assert.deepEqual(result.availableKinds, ["resident", "media", "focus"]);
});
