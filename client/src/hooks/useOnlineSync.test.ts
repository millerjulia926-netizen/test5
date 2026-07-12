import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOnlineSync } from "./useOnlineSync";

describe("useOnlineSync", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("calls onSync when the browser comes back online", () => {
    const onSync = vi.fn();
    renderHook(({ callback, enabled }) => useOnlineSync(callback, enabled), {
      initialProps: { callback: onSync, enabled: true },
    });

    window.dispatchEvent(new Event("online"));

    expect(onSync).toHaveBeenCalledOnce();
  });

  it("does not call onSync when disabled", () => {
    const onSync = vi.fn();
    renderHook(({ callback, enabled }) => useOnlineSync(callback, enabled), {
      initialProps: { callback: onSync, enabled: false },
    });

    window.dispatchEvent(new Event("online"));

    expect(onSync).not.toHaveBeenCalled();
  });
});
