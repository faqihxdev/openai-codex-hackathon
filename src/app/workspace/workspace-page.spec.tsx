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
          next_actions: ["Deploy"]
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
          next_actions: ["Deploy"]
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
});
