import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NoteEditor } from "./NoteEditor";

describe("NoteEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders create mode", () => {
    render(<NoteEditor mode="create" onSave={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "New note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save now" })).toBeDisabled();
  });

  it("renders edit mode with initial values", () => {
    render(
      <NoteEditor
        mode="edit"
        initialTitle="My title"
        initialContent="Body text"
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit note" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("My title")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Body text")).toBeInTheDocument();
  });

  it("shows validation error when title is missing", async () => {
    const user = userEvent.setup();
    render(<NoteEditor mode="create" onSave={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Start writing..."), "Some content");
    await user.click(screen.getByRole("button", { name: "Save now" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });

  it("tracks dirty state and calls onSave", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<NoteEditor mode="create" onSave={onSave} />);

    await user.type(screen.getByPlaceholderText("Note title"), "Draft title");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save now" }));

    expect(onSave).toHaveBeenCalledWith({
      title: "Draft title",
      content: "",
    });
  });

  it("shows a live markdown preview while editing", async () => {
    const user = userEvent.setup();

    render(<NoteEditor mode="create" onSave={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Start writing..."), "# Heading");

    expect(screen.getByRole("heading", { level: 1, name: "Heading" })).toBeInTheDocument();
  });
});
