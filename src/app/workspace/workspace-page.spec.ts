import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("workspace page styling", () => {
  it("uses tokenized semantic utility classes", () => {
    const filePath = join(process.cwd(), "src", "app", "workspace", "page.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("StatusChip");
    expect(source).toContain("PrimaryAction");
    expect(source).toContain("bg-surface");
  });

  it("defines desktop and mobile shell affordances", () => {
    const filePath = join(process.cwd(), "src", "app", "workspace", "page.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toContain("leftRail");
    expect(source).toContain("rightStage");
    expect(source).toContain("discuss");
    expect(source).toContain("design");
    expect(source).toContain("deploy");
    expect(source).toContain("fixed inset-x-0 bottom-0");
  });
});
