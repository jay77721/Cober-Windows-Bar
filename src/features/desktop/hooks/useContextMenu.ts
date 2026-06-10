import { useEffect } from "react";

export type UseContextMenuOptions = {
  settingsOpen: boolean;
  closeSettings: () => void;
  showNativeContextMenu: (x: number, y: number) => Promise<void>;
};

export function useContextMenu({
  settingsOpen,
  closeSettings,
  showNativeContextMenu,
}: UseContextMenuOptions): void {
  useEffect(() => {
    function handleGlobalContextMenu(event: MouseEvent) {
      event.preventDefault();
      void showNativeContextMenu(event.clientX, event.clientY);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && settingsOpen) {
        closeSettings();
      }
    }

    document.addEventListener("contextmenu", handleGlobalContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleGlobalContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen, closeSettings, showNativeContextMenu]);
}
