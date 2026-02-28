import { render, screen } from "@testing-library/react";

import { StatusChip } from "@/components/primitives";

describe("StatusChip", () => {
  it("maps tones to semantic classes", () => {
    render(
      <div>
        <StatusChip tone="neutral">Neutral</StatusChip>
        <StatusChip tone="success">Success</StatusChip>
        <StatusChip tone="warning">Warning</StatusChip>
        <StatusChip tone="danger">Danger</StatusChip>
        <StatusChip tone="accent">Accent</StatusChip>
      </div>
    );

    expect(screen.getByText("Neutral")).toHaveClass("bg-surface-2");
    expect(screen.getByText("Success")).toHaveClass("bg-success/15");
    expect(screen.getByText("Warning")).toHaveClass("bg-warning/15");
    expect(screen.getByText("Danger")).toHaveClass("bg-danger/15");
    expect(screen.getByText("Accent")).toHaveClass("bg-accent/15");
  });
});
