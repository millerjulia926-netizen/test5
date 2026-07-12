import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders markdown headings", () => {
    render(<MarkdownContent content="# Hello world" />);

    expect(screen.getByRole("heading", { name: "Hello world" })).toBeInTheDocument();
  });

  it("renders an empty placeholder for blank content", () => {
    render(<MarkdownContent content="" />);

    expect(screen.getByText("No content yet.")).toBeInTheDocument();
  });
});
