import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";

describe("app routing", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the notes page inside the app shell", () => {
    render(
      <MemoryRouter initialEntries={["/notes"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByTestId("notes-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All notes" })).toBeInTheDocument();
  });

  it("renders the login page route", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("renders the note editor placeholder route", () => {
    render(
      <MemoryRouter initialEntries={["/notes/new"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("note-editor-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New note" })).toBeInTheDocument();
  });
});
