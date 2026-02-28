import { describe, expect, test } from "vitest";

import {
  buildAppsScriptSource,
  createGoogleWorkspaceDeployer,
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

  test("treats apps script run error payload as deployment failure", async () => {
    const okResponse = (payload: unknown) =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });

    const responses = [
      okResponse({ formId: "form-123" }),
      okResponse({}),
      okResponse({ spreadsheetId: "sheet-123" }),
      okResponse({}),
      okResponse({ scriptId: "script-123" }),
      okResponse({}),
      okResponse({
        error: {
          details: [
            {
              errorMessage: "permission denied"
            }
          ]
        }
      })
    ];

    const deployer = createGoogleWorkspaceDeployer({
      accessToken: "token",
      fetcher: async () => {
        const next = responses.shift();
        if (!next) {
          throw new Error("unexpected extra request");
        }
        return next;
      }
    });

    await expect(
      deployer.deploy({
        deployment_id: "dep-123",
        canvas_state: getDefaultCanvasState()
      })
    ).rejects.toMatchObject({
      failed_step: "create_trigger",
      completed_steps: [
        "create_form",
        "create_form_questions",
        "create_sheet",
        "set_sheet_headers",
        "create_script_project",
        "set_script_content"
      ]
    });
  });
});
