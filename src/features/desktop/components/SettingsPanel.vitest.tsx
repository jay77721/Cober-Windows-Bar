import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import i18n from "../../../i18n";
import { SettingsPanel } from "./SettingsPanel";
import type {
  DesktopStatusKind,
  DesktopStatusPreferences,
} from "../../../types/hub";

vi.mock("../../../runtime/autostartRuntime", () => ({
  getAutostartEnabled: vi.fn().mockResolvedValue(false),
  setAutostartEnabled: vi.fn().mockResolvedValue(true),
}));

const BASE_PREFERENCES: DesktopStatusPreferences = {
  alwaysFloat: true,
  avoidFullscreen: true,
  lockPosition: false,
};

const NOOP_HANDLERS = {
  onToggleAlwaysFloat: () => undefined,
  onToggleAvoidFullscreen: () => undefined,
  onToggleLockPosition: () => undefined,
  onToggleAutostart: () => undefined,
  onKindSelect: (_kind: DesktopStatusKind) => undefined,
  onRefresh: () => undefined,
  onResetPosition: () => undefined,
  onOpenNativeSettings: () => undefined,
  onRecallStatusCenter: () => undefined,
  onClose: () => undefined,
};

async function changeLanguage(lng: "en" | "zh-CN") {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
}

describe("SettingsPanel i18n reactivity", () => {
  it("renders translated section labels on mount in current language", async () => {
    await changeLanguage("en");
    render(
      <SettingsPanel
        preferences={BASE_PREFERENCES}
        activeStatusKind={null}
        autostartEnabled={false}
        {...NOOP_HANDLERS}
      />,
    );

    expect(screen.getByText("Window Behavior")).toBeInTheDocument();
    expect(screen.getByText("Status Templates")).toBeInTheDocument();
    expect(screen.getByText("Quick Controls")).toBeInTheDocument();
  });

  it("updates panel copy when language switches from en to zh-CN", async () => {
    await changeLanguage("en");
    const { rerender } = render(
      <SettingsPanel
        preferences={BASE_PREFERENCES}
        activeStatusKind={null}
        autostartEnabled={false}
        {...NOOP_HANDLERS}
      />,
    );

    expect(screen.getByText("Window Behavior")).toBeInTheDocument();

    await changeLanguage("zh-CN");
    rerender(
      <SettingsPanel
        preferences={BASE_PREFERENCES}
        activeStatusKind={null}
        autostartEnabled={false}
        {...NOOP_HANDLERS}
      />,
    );

    expect(screen.getByText("窗口行为")).toBeInTheDocument();
    expect(screen.getByText("状态模板")).toBeInTheDocument();
    expect(screen.queryByText("Window Behavior")).not.toBeInTheDocument();
  });

  it("updates template descriptor labels when language switches", async () => {
    await changeLanguage("en");
    const { rerender } = render(
      <SettingsPanel
        preferences={BASE_PREFERENCES}
        activeStatusKind={null}
        autostartEnabled={false}
        {...NOOP_HANDLERS}
      />,
    );

    expect(screen.getAllByText("Resident").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Media").length).toBeGreaterThan(0);

    await changeLanguage("zh-CN");
    rerender(
      <SettingsPanel
        preferences={BASE_PREFERENCES}
        activeStatusKind={null}
        autostartEnabled={false}
        {...NOOP_HANDLERS}
      />,
    );

    expect(screen.getAllByText("常驻态").length).toBeGreaterThan(0);
    expect(screen.getAllByText("媒体").length).toBeGreaterThan(0);
  });
});
