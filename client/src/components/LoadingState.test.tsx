import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the default loading message", () => {
    render(<LoadingState />);

    expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading...");
  });

  it("renders a custom loading message", () => {
    render(<LoadingState message="Loading notes..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading notes...");
  });
});
