import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSyncOnFocus } from "./useSyncOnFocus";

describe("useSyncOnFocus", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("calls onSync when the tab becomes visible", () => {
    const onSync = vi.fn();
    renderHook(({ callback, enabled }) => useSyncOnFocus(callback, enabled), {
      initialProps: { callback: onSync, enabled: true },
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onSync).toHaveBeenCalledOnce();
  });

  it("does not call onSync when disabled", () => {
    const onSync = vi.fn();
    renderHook(({ callback, enabled }) => useSyncOnFocus(callback, enabled), {
      initialProps: { callback: onSync, enabled: false },
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onSync).not.toHaveBeenCalled();
  });
});
