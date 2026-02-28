import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WorkspacePage from "@/app/workspace/page";

describe("workspace page multimodal interaction", () => {
  function readLastRequestPayload() {
    const [, init] = vi.mocked(globalThis.fetch).mock.calls.at(-1)!;
    return JSON.parse(String(init?.body));
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          chat_reply: "Applied update from guided controls. The workflow is ready for deployment checks.",
          canvas_state: {
            process_name: "Expense Approval",
            form_fields: [
              { type: "SHORT_TEXT", label: "Employee name", required: true },
              { type: "DATE", label: "Expense date", required: true },
              { type: "PARAGRAPH", label: "Business justification", required: true }
            ],
            sheet_headers: ["Timestamp", "Employee name", "Expense date", "Business justification", "Edit Link"],
            flow_steps: [
              { id: "start", label: "Request Input", type: "input" },
              { id: "validate", label: "Validation", type: "process" },
              { id: "submit", label: "Approved Submission", type: "output" }
            ]
          },
          canvas_state_patch: [],
          confidence: 0.9,
          unresolved_questions: [],
          next_actions: ["Deploy"],
          deploy_ready: true,
          deploy_readiness_reasons: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows multimodal left-rail tabs", () => {
    render(<WorkspacePage />);

    expect(screen.getAllByRole("tab", { name: "Conversation" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("tab", { name: "Questions" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("tab", { name: "Templates" }).length).toBeGreaterThanOrEqual(1);
  });

  it("maps flow step types to distinct canvas node types", () => {
    render(<WorkspacePage />);

    expect(screen.getByTestId("flow-node-start")).toHaveAttribute("data-node-type", "input");
    expect(screen.getByTestId("flow-node-validate")).toHaveAttribute("data-node-type", "process");
    expect(screen.getByTestId("flow-node-submit")).toHaveAttribute("data-node-type", "output");
  });

  it("routes template actions to intent API as normalized events", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getAllByRole("tab", { name: "Templates" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Use template" })[0]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const payload = readLastRequestPayload();

    expect(url).toBe("/api/v1/intent");
    expect(payload.intent_event.source).toBe("template");
    expect(payload.intent_event.intent_type).toBe("set_constraint");
    expect(payload.intent_event.payload.template_id).toBeTypeOf("string");
  });

  it("routes card controls to intent API as normalized events", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getAllByRole("button", { name: "Add approval step" })[0]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const payload = readLastRequestPayload();

    expect(payload.intent_event.source).toBe("card");
    expect(payload.intent_event.intent_type).toBe("add_step");
    expect(payload.intent_event.payload.action).toBe("add_approval_step");
  });

  it("routes chat submissions to intent API and refreshes UI state", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    expect(screen.getAllByText("1 unresolved").length).toBeGreaterThanOrEqual(1);

    await user.type(screen.getAllByLabelText("Free-form refinement")[0], "approved by Finance Lead");
    await user.click(screen.getAllByRole("button", { name: "Send chat intent" })[0]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const payload = readLastRequestPayload();
    expect(payload.intent_event.source).toBe("chat");
    expect(payload.intent_event.intent_type).toBe("set_constraint");
    expect(payload.intent_event.payload.message).toBe("approved by Finance Lead");

    await waitFor(() => {
      expect(screen.getAllByText("0 unresolved").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("routes canvas actions to intent API as normalized events", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getAllByRole("button", { name: "Add review step" })[0]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const payload = readLastRequestPayload();
    expect(payload.intent_event.source).toBe("canvas");
    expect(payload.intent_event.intent_type).toBe("add_step");
    expect(payload.intent_event.payload.action).toBe("add_canvas_step");
  });

  it("supports inline canvas node label edits and persists them through intent events", async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          chat_reply: "Applied update from canvas edits. The workflow is ready for deployment checks.",
          canvas_state: {
            process_name: "Expense Approval",
            form_fields: [
              { type: "SHORT_TEXT", label: "Employee name", required: true },
              { type: "DATE", label: "Expense date", required: true },
              { type: "PARAGRAPH", label: "Business justification", required: true }
            ],
            sheet_headers: ["Timestamp", "Employee name", "Expense date", "Business justification", "Edit Link"],
            flow_steps: [
              { id: "start", label: "Request Intake", type: "input" },
              { id: "validate", label: "Validation", type: "process" },
              { id: "submit", label: "Approved Submission", type: "output" }
            ]
          },
          canvas_state_patch: [],
          confidence: 0.9,
          unresolved_questions: [],
          next_actions: ["Deploy"],
          deploy_ready: true,
          deploy_readiness_reasons: []
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    render(<WorkspacePage />);

    const editControl = screen
      .getAllByLabelText("Edit Request Input")
      .find((element) => element.tagName === "BUTTON");

    if (!editControl) {
      throw new Error("Missing edit affordance for Request Input node");
    }

    fireEvent.click(editControl);

    const stepLabelInput = (await screen.findAllByDisplayValue("Request Input")).find(
      (element) => element.tagName === "INPUT"
    );

    if (!stepLabelInput) {
      throw new Error("Missing inline step label input");
    }

    fireEvent.change(stepLabelInput, { target: { value: "Request Intake" } });
    fireEvent.keyDown(stepLabelInput, { key: "Enter", code: "Enter" });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const payload = readLastRequestPayload();
    expect(payload.intent_event.source).toBe("canvas");
    expect(payload.intent_event.intent_type).toBe("update_field");
    expect(payload.intent_event.payload.action).toBe("rename_step");
    expect(payload.intent_event.payload.step_id).toBe("start");
    expect(payload.intent_event.payload.label).toBe("Request Intake");

    await waitFor(() => {
      expect(screen.getAllByText("Request Intake").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("blocks deploy until readiness requirements are resolved", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    const blockedButtons = screen.getAllByRole("button", {
      name: "Resolve blockers to deploy"
    });
    expect(blockedButtons.length).toBeGreaterThan(0);
    blockedButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    await user.click(screen.getAllByRole("button", { name: "Add approval step" })[0]);

    await waitFor(() => {
      const deployButtons = screen.getAllByRole("button", {
        name: "Deploy to Google Workspace"
      });
      expect(
        deployButtons.some((button) => !button.hasAttribute("disabled"))
      ).toBe(true);
    });
  });

  it("shows failed step reason and supports retry to success", async () => {
    const user = userEvent.setup();
    let statusPollCount = 0;

    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/v1/intent" && method === "POST") {
        return new Response(
          JSON.stringify({
            chat_reply:
              "Applied update from guided controls. The workflow is ready for deployment checks.",
            canvas_state: {
              process_name: "Expense Approval",
              form_fields: [
                { type: "SHORT_TEXT", label: "Employee name", required: true },
                { type: "DATE", label: "Expense date", required: true },
                {
                  type: "PARAGRAPH",
                  label: "Business justification",
                  required: true
                }
              ],
              sheet_headers: [
                "Timestamp",
                "Employee name",
                "Expense date",
                "Business justification",
                "Edit Link"
              ],
              flow_steps: [
                { id: "start", label: "Request Input", type: "input" },
                { id: "validate", label: "Validation", type: "process" },
                { id: "submit", label: "Approved Submission", type: "output" }
              ]
            },
            canvas_state_patch: [],
            confidence: 0.9,
            unresolved_questions: [],
            next_actions: ["Deploy"],
            deploy_ready: true,
            deploy_readiness_reasons: []
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url === "/api/v1/deployments" && method === "POST") {
        return new Response(
          JSON.stringify({
            deployment_id: "dep-test",
            status: "queued"
          }),
          {
            status: 202,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url === "/api/v1/deployments/dep-test" && method === "GET") {
        statusPollCount += 1;
        if (statusPollCount === 1) {
          return new Response(
            JSON.stringify({
              deployment_id: "dep-test",
              status: "failed",
              assets: {
                form_id: "form-dep-test",
                spreadsheet_id: "sheet-dep-test",
                script_id: null
              },
              error: {
                code: "UPSTREAM_UNAVAILABLE",
                message:
                  "Script step failed. Retry to continue from the last checkpoint.",
                details: {
                  failed_step: "Script"
                }
              },
              progress: {
                current_step: "Script",
                completed_steps: ["Auth", "Form", "Sheet"],
                failed_step: "Script"
              }
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json"
              }
            }
          );
        }

        return new Response(
          JSON.stringify({
            deployment_id: "dep-test",
            status: "succeeded",
            assets: {
              form_id: "form-dep-test",
              spreadsheet_id: "sheet-dep-test",
              script_id: "script-dep-test"
            },
            error: null,
            progress: {
              current_step: "Trigger",
              completed_steps: [
                "Auth",
                "Form",
                "Sheet",
                "Script",
                "Trigger"
              ],
              failed_step: null
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      if (url === "/api/v1/deployments/dep-test/retry" && method === "POST") {
        return new Response(
          JSON.stringify({
            deployment_id: "dep-test",
            status: "running"
          }),
          {
            status: 202,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }

      return new Response(JSON.stringify({}), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    });

    render(<WorkspacePage />);
    await user.click(screen.getAllByRole("button", { name: "Add approval step" })[0]);

    await waitFor(() => {
      const deployButtons = screen.getAllByRole("button", {
        name: "Deploy to Google Workspace"
      });
      expect(
        deployButtons.some((button) => !button.hasAttribute("disabled"))
      ).toBe(true);
    });

    await user.click(
      screen.getAllByRole("button", { name: "Deploy to Google Workspace" })[0]
    );

    await screen.findAllByText("Failed at step: Script");
    await screen.findAllByText(
      "Script step failed. Retry to continue from the last checkpoint."
    );

    await user.click(screen.getAllByRole("button", { name: "Retry failed step" })[0]);

    await screen.findAllByText("Deployment completed successfully.");
    await screen.findAllByText("Form ID: form-dep-test");
    await screen.findAllByText("Script ID: script-dep-test");
  });
});
