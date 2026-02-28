import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppShell } from "@/components/shell";

function renderAppShell() {
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
}

describe("AppShell", () => {
  it("renders desktop regions and mobile tabs", () => {
    renderAppShell();

    expect(screen.getByLabelText("Interaction rail")).toBeInTheDocument();
    expect(screen.getByLabelText("Design stage")).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Discuss" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Design" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Deploy" })).toBeInTheDocument();
  });

  it("exposes keyboard-focus styling hooks for mobile tabs", () => {
    renderAppShell();

    const discussTab = screen.getByRole("tab", { name: "Discuss" });

    expect(discussTab).toHaveClass("focus-visible:outline-2");
    expect(discussTab).toHaveClass("focus-visible:outline-offset-2");
    expect(discussTab).toHaveClass("focus-visible:outline-accent");
    expect(discussTab).toHaveAttribute("data-state", "active");
  });

  it("switches the active tab panel when a tab is clicked", async () => {
    const user = userEvent.setup();
    renderAppShell();

    const discussTab = screen.getByRole("tab", { name: "Discuss" });
    const designTab = screen.getByRole("tab", { name: "Design" });

    expect(discussTab).toHaveAttribute("aria-selected", "true");
    expect(designTab).toHaveAttribute("aria-selected", "false");

    await user.click(designTab);

    expect(discussTab).toHaveAttribute("aria-selected", "false");
    expect(designTab).toHaveAttribute("aria-selected", "true");
  });

  it("exposes accessible tablist semantics for keyboard navigation", () => {
    renderAppShell();

    const tabList = screen.getByRole("tablist", { name: "Workspace view switch" });
    const discussTab = screen.getByRole("tab", { name: "Discuss" });
    const designTab = screen.getByRole("tab", { name: "Design" });
    const deployTab = screen.getByRole("tab", { name: "Deploy" });

    expect(tabList).toBeInTheDocument();
    expect(discussTab).toHaveAttribute("aria-selected", "true");
    expect(discussTab).toHaveAttribute("aria-controls");
    expect(designTab).toHaveAttribute("aria-controls");
    expect(deployTab).toHaveAttribute("aria-controls");
  });
});
