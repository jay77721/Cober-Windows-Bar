import { useCallback, useEffect, useState } from "react";
import {
  listenStatusCenterSettings,
} from "../../../runtime/desktopProductRuntime";
import { getTauriInvoke } from "../../../runtime/tauriRuntime";
import type { DesktopStatusPreferences, DesktopStatusPreferencesPayload } from "../../../types/hub";

const STATUS_CENTER_SETTINGS_COMMAND = "get_status_center_settings";
const SET_STATUS_CENTER_PREFERENCES_COMMAND = "set_status_center_preferences";
const STATUS_WINDOW_FLOATING_COMMAND = "set_status_window_floating";

const DEFAULT_PREFERENCES: DesktopStatusPreferences = {
  alwaysFloat: true,
  avoidFullscreen: true,
  lockPosition: false,
};

export type UsePreferencesResult = {
  preferences: DesktopStatusPreferences;
  updatePreferences: (patch: Partial<DesktopStatusPreferences>) => Promise<void>;
};

function isPreferencesPayload(value: unknown): value is DesktopStatusPreferencesPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const preferences = (value as DesktopStatusPreferencesPayload).preferences;

  return (
    typeof preferences?.alwaysFloat === "boolean" &&
    typeof preferences.avoidFullscreen === "boolean" &&
    typeof preferences.lockPosition === "boolean"
  );
}

export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferences] = useState<DesktopStatusPreferences>(DEFAULT_PREFERENCES);

  const updatePreferences = useCallback(
    async (patch: Partial<DesktopStatusPreferences>) => {
      setPreferences((prev) => {
        const nextValue = { ...prev, ...patch };
        const invoke = getTauriInvoke();

        if (invoke) {
          void invoke(SET_STATUS_CENTER_PREFERENCES_COMMAND, {
            preferences: nextValue,
          }).then(() => {
            if (typeof patch.alwaysFloat === "boolean") {
              return invoke(STATUS_WINDOW_FLOATING_COMMAND, {
                floating: nextValue.alwaysFloat,
              });
            }
          });
        }

        return nextValue;
      });
    },
    [],
  );

  // Load initial settings + subscribe to external settings changes
  useEffect(() => {
    const invoke = getTauriInvoke();
    if (!invoke) {
      return;
    }

    let disposed = false;
    let offSettings: (() => void) | undefined;

    void (async () => {
      try {
        const settingsResult = await invoke(STATUS_CENTER_SETTINGS_COMMAND);
        if (!disposed && isPreferencesPayload(settingsResult)) {
          setPreferences({ ...settingsResult.preferences });
        }

        offSettings = await listenStatusCenterSettings((payload) => {
          if (!disposed) {
            setPreferences({ ...payload.preferences });
          }
        });
      } catch {
        // Keep browser diagnostics usable when the native product event bridge is absent.
      }
    })();

    return () => {
      disposed = true;
      offSettings?.();
    };
  }, []);

  return { preferences, updatePreferences };
}
