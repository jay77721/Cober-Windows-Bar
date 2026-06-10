import { MonitorCog, X } from "lucide-react";
import { DESKTOP_STATUS_TEMPLATE_DESCRIPTORS, getDesktopStatusSettingsCopy } from "../../../data/desktopStatusConfig";
import type { DesktopStatusKind, DesktopStatusPreferences } from "../../../types/hub";

export type SettingsPanelProps = {
  preferences: DesktopStatusPreferences;
  activeStatusKind: DesktopStatusKind | null;
  onToggleAlwaysFloat: () => void;
  onToggleAvoidFullscreen: () => void;
  onToggleLockPosition: () => void;
  onKindSelect: (kind: DesktopStatusKind) => void;
  onRefresh: () => void;
  onResetPosition: () => void;
  onOpenNativeSettings: () => void;
  onRecallStatusCenter: () => void;
  onClose: () => void;
};

function settingsToggleClassName(active: boolean) {
  return active ? "product-status-toggle is-active" : "product-status-toggle";
}

export function SettingsPanel({
  preferences,
  activeStatusKind,
  onToggleAlwaysFloat,
  onToggleAvoidFullscreen,
  onToggleLockPosition,
  onKindSelect,
  onRefresh,
  onResetPosition,
  onOpenNativeSettings,
  onRecallStatusCenter,
  onClose,
}: SettingsPanelProps) {
  const settingsCopy = getDesktopStatusSettingsCopy();

  return (
    <section className="product-status-settings" aria-label={settingsCopy.panel.ariaLabel}>
      <header className="product-status-settings-header">
        <div className="product-status-settings-title">
          <div className="product-status-settings-icon" aria-hidden="true">
            <MonitorCog size={18} strokeWidth={2.1} />
          </div>
          <div>
            <strong>{settingsCopy.panel.title}</strong>
            <span>{settingsCopy.panel.description}</span>
          </div>
        </div>
        <button
          className="product-status-settings-close"
          type="button"
          aria-label={settingsCopy.panel.closeLabel}
          title={settingsCopy.panel.closeLabel}
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </header>

      <div className="product-status-settings-body">
        <div className="product-status-settings-section">
          <span className="product-status-settings-label">{settingsCopy.sections.windowBehavior}</span>
          <div className="product-status-settings-grid">
            <button
              type="button"
              className={settingsToggleClassName(preferences.alwaysFloat)}
              onClick={onToggleAlwaysFloat}
            >
              <strong>{settingsCopy.toggles.alwaysFloat.title}</strong>
              <span>{settingsCopy.toggles.alwaysFloat.description}</span>
              <small>
                {preferences.alwaysFloat
                  ? settingsCopy.toggles.alwaysFloat.activeLabel
                  : settingsCopy.toggles.alwaysFloat.inactiveLabel}
              </small>
            </button>
            <button
              type="button"
              className={settingsToggleClassName(preferences.avoidFullscreen)}
              onClick={onToggleAvoidFullscreen}
            >
              <strong>{settingsCopy.toggles.avoidFullscreen.title}</strong>
              <span>{settingsCopy.toggles.avoidFullscreen.description}</span>
              <small>
                {preferences.avoidFullscreen
                  ? settingsCopy.toggles.avoidFullscreen.activeLabel
                  : settingsCopy.toggles.avoidFullscreen.inactiveLabel}
              </small>
            </button>
            <button
              type="button"
              className={settingsToggleClassName(preferences.lockPosition)}
              onClick={onToggleLockPosition}
            >
              <strong>{settingsCopy.toggles.lockPosition.title}</strong>
              <span>{settingsCopy.toggles.lockPosition.description}</span>
              <small>
                {preferences.lockPosition
                  ? settingsCopy.toggles.lockPosition.activeLabel
                  : settingsCopy.toggles.lockPosition.inactiveLabel}
              </small>
            </button>
          </div>
        </div>

        <div className="product-status-settings-section">
          <span className="product-status-settings-label">{settingsCopy.sections.statusTemplates}</span>
          <div className="product-status-settings-kinds">
            {DESKTOP_STATUS_TEMPLATE_DESCRIPTORS.map((descriptor) => {
              const active = descriptor.kind === activeStatusKind;

              return (
                <button
                  key={descriptor.kind}
                  type="button"
                  className={active ? "product-status-kind is-active" : "product-status-kind"}
                  onClick={() => onKindSelect(descriptor.kind)}
                >
                  <strong>{descriptor.label}</strong>
                  <span>{descriptor.description}</span>
                  <small>{descriptor.providerHint}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="product-status-settings-actions">
          <div className="product-status-settings-actions-copy">
            <strong>{settingsCopy.actions.quickPanelTitle}</strong>
            <span>{settingsCopy.actions.quickPanelDescription}</span>
          </div>
          <button type="button" className="product-status-settings-action" onClick={onRefresh}>
            {settingsCopy.actions.refresh}
          </button>
          <button type="button" className="product-status-settings-action" onClick={onResetPosition}>
            {settingsCopy.actions.resetPosition}
          </button>
          <button
            type="button"
            className="product-status-settings-action is-primary"
            onClick={onOpenNativeSettings}
          >
            {settingsCopy.actions.openNativeSettings}
          </button>
          <button
            type="button"
            className="product-status-settings-action"
            onClick={onRecallStatusCenter}
          >
            {settingsCopy.actions.recallStatusCenter}
          </button>
        </div>
      </div>
    </section>
  );
}
