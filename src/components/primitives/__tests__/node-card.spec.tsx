import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { NodeCard } from "@/components/primitives";

describe("NodeCard", () => {
  it("renders node variants with expected classes", () => {
    render(
      <div>
        <NodeCard type="input" title="Input step" />
        <NodeCard type="process" title="Process step" />
        <NodeCard type="output" title="Output step" />
      </div>
    );

    expect(screen.getByText("Input step").closest("article")).toHaveClass("border-accent");
    expect(screen.getByText("Process step").closest("article")).toHaveClass("border-line");
    expect(screen.getByText("Output step").closest("article")).toHaveClass("border-accent-2");
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();

    render(<NodeCard type="process" title="Validate" onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
