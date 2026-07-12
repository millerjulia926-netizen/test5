import { useEffect } from "react";

export function useOnlineSync(onSync: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleOnline() {
      onSync();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [enabled, onSync]);
}
