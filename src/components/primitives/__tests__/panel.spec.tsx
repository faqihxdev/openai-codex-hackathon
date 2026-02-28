import { render, screen } from "@testing-library/react";

import { Panel } from "@/components/primitives";

describe("Panel", () => {
  it("applies variant styles", () => {
    const { rerender } = render(
      <Panel title="Panel" subtitle="default" variant="default">
        Body
      </Panel>
    );

    expect(screen.getByText("Panel").closest("div")).toHaveClass("bg-surface");

    rerender(
      <Panel title="Panel" subtitle="elevated" variant="elevated">
        Body
      </Panel>
    );
    expect(screen.getByText("Panel").closest("div")).toHaveClass("shadow-panel");

    rerender(
      <Panel title="Panel" subtitle="tinted" variant="tinted">
        Body
      </Panel>
    );
    expect(screen.getByText("Panel").closest("div")).toHaveClass("bg-surface-2");
  });
});
