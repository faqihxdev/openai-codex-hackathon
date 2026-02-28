import { describe, expect, test } from "vitest";

import {
  buildAppsScriptSource,
  createMockGoogleWorkspaceDeployer
} from "@/lib/server/deployments/google-workspace";
import { getDefaultCanvasState } from "@/lib/workspace/templates";

describe("google workspace deployer helpers", () => {
  test("builds apps script source with Timestamp and Edit Link mapping", () => {
    const source = buildAppsScriptSource({
      sheetId: "sheet-123",
      headers: ["Timestamp", "Requester Name", "Edit Link"],
      formId: "form-123"
    });

    expect(source).toContain("Timestamp");
    expect(source).toContain("Edit Link");
    expect(source).toContain("getEditResponseUrl");
    expect(source).toContain("sheet.appendRow");
    expect(source).toContain("createSubmitTrigger");
  });

  test("mock deployer returns asset ids for form, sheet, and script", async () => {
    const deployer = createMockGoogleWorkspaceDeployer();
    const result = await deployer.deploy({
      deployment_id: "dep-123",
      canvas_state: getDefaultCanvasState()
    });

    expect(result.form_id).toContain("form_dep-123");
    expect(result.spreadsheet_id).toContain("sheet_dep-123");
    expect(result.script_id).toContain("script_dep-123");
  });
});

