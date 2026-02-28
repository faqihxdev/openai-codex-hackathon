import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WorkspacePage from "@/app/workspace/page";

describe("workspace page multimodal interaction", () => {
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

  it("routes template actions to intent API as normalized events", async () => {
    const user = userEvent.setup();
    render(<WorkspacePage />);

    await user.click(screen.getAllByRole("tab", { name: "Templates" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Use template" })[0]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const payload = JSON.parse(String(init?.body));

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
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const payload = JSON.parse(String(init?.body));

    expect(payload.intent_event.source).toBe("card");
    expect(payload.intent_event.intent_type).toBe("add_step");
    expect(payload.intent_event.payload.action).toBe("add_approval_step");
  });
});
