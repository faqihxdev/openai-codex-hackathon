import { render, screen } from "@testing-library/react";

import { PrimaryAction } from "@/components/primitives";

describe("PrimaryAction", () => {
  it("stays accessible and disabled while busy", () => {
    render(<PrimaryAction busy>Deploy</PrimaryAction>);

    const button = screen.getByRole("button", { name: "Deploy" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Working...")).toBeInTheDocument();
  });

  it("respects disabled prop", () => {
    render(<PrimaryAction disabled>Deploy</PrimaryAction>);

    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
  });
});
