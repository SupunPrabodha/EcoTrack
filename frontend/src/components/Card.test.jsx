import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import Card from "./Card";

describe("Card", () => {
  it("renders a title when provided", () => {
    render(
      <Card title="My Title">
        <div>Body</div>
      </Card>
    );

    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("does not render a title element when title is empty", () => {
    render(
      <Card>
        <div>Body</div>
      </Card>
    );

    expect(screen.queryByText("My Title")).not.toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
