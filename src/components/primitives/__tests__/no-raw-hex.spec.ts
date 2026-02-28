import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir);

  return entries.flatMap((entry) => {
    const absolutePath = join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectFiles(absolutePath);
    }

    if (absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx")) {
      return [absolutePath];
    }

    return [];
  });
}

describe("components use semantic tokens", () => {
  it("does not contain raw hex colors in component files", () => {
    const componentRoot = join(process.cwd(), "src", "components");
    const files = collectFiles(componentRoot);
    const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const matches = content.match(hexPattern) ?? [];
      expect(matches, `${file} should not contain raw hex color literals`).toHaveLength(0);
    }
  });
});
