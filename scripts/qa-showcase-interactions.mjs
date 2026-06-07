import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const baseUrl = process.env.SHOWCASE_BASE_URL ?? "http://127.0.0.1:5173";
const showcaseUrl = `${baseUrl}/showcase`;
const outputDir = "output/playwright";

const consoleErrors = [];
const pageErrors = [];

let server;

async function isShowcaseAvailable() {
  try {
    const response = await fetch(showcaseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForShowcase(timeoutMs = 20_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isShowcaseAvailable()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${showcaseUrl}`);
}

async function ensureServer() {
  if (await isShowcaseAvailable()) {
    return false;
  }

  const command = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = [
    ...(process.env.npm_execpath ? [process.env.npm_execpath] : []),
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
  ];

  server = spawn(command, args, {
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (data) => process.stdout.write(data));
  server.stderr.on("data", (data) => process.stderr.write(data));

  await waitForShowcase();
  return true;
}

async function stopServer() {
  if (!server) {
    return;
  }

  const child = server;
  server = undefined;

  child.stdout?.removeAllListeners();
  child.stderr?.removeAllListeners();
  child.stdout?.destroy();
  child.stderr?.destroy();

  if (!child.pid || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const taskkill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      taskkill.on("close", resolve);
      taskkill.on("error", resolve);
    });
    return;
  }

  child.kill();
}

async function clickButton(locator, name) {
  await locator.getByRole("button", { name, exact: true }).click();
}

async function expectText(locator, text, timeout = 5_000) {
  await locator.getByText(text, { exact: true }).waitFor({ state: "visible", timeout });
}

async function run() {
  await mkdir(outputDir, { recursive: true });
  const startedServer = await ensureServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  await page.addInitScript(() => {
    window.__qaTauriInvokeDelayMs = 0;
    window.__TAURI__ = {
      core: {
        invoke: async (command) => {
          if (command !== "get_hub_event_fixtures") {
            throw new Error(`Unexpected Tauri command: ${command}`);
          }

          if (window.__qaTauriInvokeDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, window.__qaTauriInvokeDelayMs));
          }

          return [
            {
              id: "qa-tauri-fixture-ai",
              type: "ai",
              source: "mock",
              createdAt: 1780743600000,
              progress: 64,
              payload: {
                id: "qa-tauri-fixture-ai-task",
                type: "ai",
                title: "QA Tauri Fixture",
                subtitle: "Injected runtime fixture",
                progress: 64,
                accent: "blue",
              },
              metadata: { runtime: "tauri", fixture: true },
            },
          ];
        },
      },
    };
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(showcaseUrl, { waitUntil: "networkidle" });

    if (!response || response.status() !== 200) {
      throw new Error(`/showcase returned ${response?.status() ?? "no response"}`);
    }

    const panel = page
      .locator("div")
      .filter({ has: page.getByText("Provider Demo", { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Stop provider", exact: true }) })
      .first();

    await expectText(panel, "Stopped, events stay");
    await expectText(panel, "Provider stopped");

    await clickButton(panel, "Music");
    await expectText(panel, "Mock Music Provider");

    await clickButton(panel, "AI");
    await expectText(panel, "Mock AI Provider");

    await clickButton(panel, "Download");
    await expectText(panel, "Mock Download Provider");

    await clickButton(panel, "Notify");
    await expectText(panel, "Mock Notification Provider");

    await clickButton(panel, "Stop provider");
    await expectText(panel, "Stopped, events stay");
    await expectText(panel, "Provider stopped");

    await clickButton(panel, "Music");
    await expectText(panel, "Mock Music Provider");

    await clickButton(panel, "Clear to idle");
    await expectText(panel, "Stopped, events stay");
    await expectText(panel, "Provider stopped");
    await expectText(page, "Current mode: Idle");
    await expectText(page, "Idle event stream");

    await clickButton(panel, "Tauri Fixture");
    await expectText(panel, "Tauri fixture published");
    await expectText(page, "QA Tauri Fixture");
    await expectText(page, "Injected runtime fixture");
    await expectText(page, "Current mode: AI Progress");

    await page.evaluate(() => {
      window.__qaTauriInvokeDelayMs = 350;
    });
    await clickButton(panel, "Tauri Fixture");
    await clickButton(panel, "Clear to idle");
    await page.waitForTimeout(500);
    await expectText(page, "Current mode: Idle");
    await expectText(page, "Idle event stream");

    const staleFixtureCount = await page.getByText("QA Tauri Fixture", { exact: true }).count();
    if (staleFixtureCount > 0) {
      throw new Error("Stale Tauri fixture request published after Clear to idle");
    }

    const stalePublishedLabelCount = await page.getByText("Tauri fixture published", { exact: true }).count();
    if (stalePublishedLabelCount > 0) {
      throw new Error("Stale Tauri fixture request updated the playground label after Clear to idle");
    }

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(
        [
          ...consoleErrors.map((error) => `console error: ${error}`),
          ...pageErrors.map((error) => `page error: ${error}`),
        ].join("\n"),
      );
    }

    console.log(`Showcase interaction QA passed at ${showcaseUrl}${startedServer ? " (started Vite)" : ""}`);
  } catch (error) {
    await page.screenshot({ path: `${outputDir}/showcase-interactions-failure.png`, fullPage: true });
    throw error;
  } finally {
    await browser.close();
    await stopServer();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
