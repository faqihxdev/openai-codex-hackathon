import { render, screen } from "@testing-library/react";

import { AppShell } from "@/components/shell";

describe("AppShell", () => {
  it("renders desktop regions and mobile tabs", () => {
    render(
      <AppShell
        topBar={<div>Top</div>}
        leftRail={<div>Left content</div>}
        rightStage={<div>Right content</div>}
        mobilePanels={{
          discuss: <div>Discuss content</div>,
          design: <div>Design content</div>,
          deploy: <div>Deploy content</div>
        }}
      />
    );

    expect(screen.getByLabelText("Interaction rail")).toBeInTheDocument();
    expect(screen.getByLabelText("Design stage")).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Discuss" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Design" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Deploy" })).toBeInTheDocument();
  });

  it("exposes keyboard-focus styling hooks for mobile tabs", () => {
    render(
      <AppShell
        topBar={<div>Top</div>}
        leftRail={<div>Left content</div>}
        rightStage={<div>Right content</div>}
        mobilePanels={{
          discuss: <div>Discuss content</div>,
          design: <div>Design content</div>,
          deploy: <div>Deploy content</div>
        }}
      />
    );

    const discussTab = screen.getByRole("tab", { name: "Discuss" });

    expect(discussTab).toHaveClass("focus-visible:outline-2");
    expect(discussTab).toHaveClass("focus-visible:outline-offset-2");
    expect(discussTab).toHaveClass("focus-visible:outline-accent");
    expect(discussTab).toHaveAttribute("data-state", "active");
  });
});
