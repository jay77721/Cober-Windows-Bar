import { strict as assert } from "node:assert";
import i18n from "../i18n";

// Set language BEFORE any module that calls i18n.t() at load time
i18n.changeLanguage("zh-CN");

import {
  getDesktopStatusTemplateDescriptors,
  createDesktopStatusStateTemplates,
  createSystemPerformanceMetricSnapshot,
  getDesktopStatusLabels,
  getDesktopStatusShellCopy,
  getDesktopStatusSettingsCopy,
} from "./desktopStatusConfig";
import { systemPerformanceMetrics } from "./mockHubData";

const mojibakePattern = /[\uFFFD\u951F\u4fd9\u7ca8\u93c9\u3128\u6d63\u51aa\u5f42\u9903\u5890\u6577]/;

const metricLabels = Object.fromEntries(
  systemPerformanceMetrics.map((metric) => [metric.id, metric.label]),
);

assert.equal(metricLabels.cpu, "CPU");
assert.equal(metricLabels.memory, "\u5185\u5b58");
assert.equal(metricLabels.download, "\u4e0b\u8f7d");
assert.equal(metricLabels.upload, "\u4e0a\u4f20");

for (const label of Object.values(metricLabels)) {
  assert.equal(mojibakePattern.test(label), false, `${label} must not be mojibake`);
}

const labels = getDesktopStatusLabels();
const shellCopy = getDesktopStatusShellCopy();
const settingsCopy = getDesktopStatusSettingsCopy();
assert.equal(labels.cpu, "CPU");
assert.equal(labels.memory, "\u5185\u5b58");
assert.equal(shellCopy.ariaLabel, "Cober Windows 状态中心");
assert.equal(settingsCopy.panel.title, "\u72b6\u6001\u4e2d\u5fc3\u8bbe\u7f6e");
assert.equal(settingsCopy.sections.windowBehavior, "\u7a97\u53e3\u884c\u4e3a");
assert.equal(settingsCopy.actions.openNativeSettings, "\u6253\u5f00\u539f\u751f\u8bbe\u7f6e\u5165\u53e3");

assert.deepEqual(
  getDesktopStatusTemplateDescriptors().map((descriptor) => descriptor.label),
  [
    "\u5e38\u9a7b\u6001",
    "\u5a92\u4f53\u6001",
    "\u4e0b\u8f7d\u6001",
    "\u66f4\u65b0\u6001",
    "\u526a\u8d34\u677f\u6001",
    "\u4e13\u6ce8\u6001",
  ],
);

const stateTemplates = createDesktopStatusStateTemplates(
  createSystemPerformanceMetricSnapshot({
    cpu: 17,
    memory: 61,
    downloadSpeed: 2_457_600,
    uploadSpeed: 512_000,
  }),
);

assert.equal(stateTemplates.resident.title, "\u7cfb\u7edf\u6027\u80fd");
assert.equal(stateTemplates.resident.subtitle, "\u5e38\u9a7b\u72b6\u6001\u4e2d\u5fc3");
assert.equal(stateTemplates.clipboard.title, "\u5df2\u590d\u5236\u5185\u5bb9");
assert.equal(stateTemplates.clipboard.subtitle, "\u526a\u8d34\u677f\u66f4\u65b0");
assert.equal(stateTemplates.focus.sessionLabel, "\u6df1\u5ea6\u5de5\u4f5c 25 \u5206\u949f");

for (const value of [
  shellCopy.ariaLabel,
  settingsCopy.panel.ariaLabel,
  settingsCopy.panel.title,
  settingsCopy.panel.description,
  settingsCopy.panel.closeLabel,
  settingsCopy.sections.windowBehavior,
  settingsCopy.sections.statusTemplates,
  ...Object.values(settingsCopy.toggles).flatMap((toggle) => [
    toggle.title,
    toggle.description,
    toggle.activeLabel,
    toggle.inactiveLabel,
  ]),
  ...Object.values(settingsCopy.actions),
  ...getDesktopStatusTemplateDescriptors().flatMap((descriptor) => [descriptor.label, descriptor.description]),
  stateTemplates.resident.title,
  stateTemplates.resident.subtitle,
  stateTemplates.media.subtitle,
  stateTemplates.download.subtitle,
  stateTemplates.update.title,
  stateTemplates.update.subtitle,
  stateTemplates.clipboard.title,
  stateTemplates.clipboard.subtitle,
  stateTemplates.clipboard.detail,
  stateTemplates.focus.title,
  stateTemplates.focus.subtitle,
  stateTemplates.focus.sessionLabel,
  stateTemplates.focus.detail,
]) {
  assert.equal(mojibakePattern.test(value), false, `${value} must not be mojibake`);
}

console.log("ok desktop status config copy stays readable");
