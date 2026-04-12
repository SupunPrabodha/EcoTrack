import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import Stat from "./Stat";

describe("Stat", () => {
  it("renders label and value", () => {
    render(<Stat label="Total" value="123" />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("renders sub content when provided", () => {
    render(<Stat label="Total" value="123" sub={<span>Extra</span>} />);

    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
