import { useEffect } from "react";

export function useSyncOnFocus(onSync: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        onSync();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, onSync]);
}
