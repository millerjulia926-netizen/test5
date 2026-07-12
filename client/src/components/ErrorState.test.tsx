import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the error message", () => {
    render(<ErrorState message="Something went wrong" />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a retry action link", () => {
    render(
      <MemoryRouter>
        <ErrorState message="Failed" actionLabel="Back" actionTo="/notes" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/notes");
  });
});
