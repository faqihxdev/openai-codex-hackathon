import { describe, expect, it } from "vitest";

import { processIntentEvent } from "@/lib/intent/engine";
import {
  normalizeAddApprovalStepIntent,
  normalizeAnswerApproverIntent,
  normalizeTemplateIntent
} from "@/lib/intent/normalizers";
import { getDefaultCanvasState } from "@/lib/workspace/templates";

describe("intent processing engine", () => {
  it("keeps approver question unresolved until answered by a control intent", () => {
    const seedCanvas = getDefaultCanvasState();
    const afterStep = processIntentEvent({
      intent_event: normalizeAddApprovalStepIntent(),
      canvas_state: seedCanvas
    });

    expect(afterStep.unresolved_questions).toContain("Who approves requests above 5000?");
    expect(afterStep.deploy_ready).toBe(false);
    expect(afterStep.deploy_readiness_reasons).toContain("Critical unresolved questions remain.");

    const afterAnswer = processIntentEvent({
      intent_event: normalizeAnswerApproverIntent("Finance Lead"),
      canvas_state: afterStep.canvas_state
    });

    expect(afterAnswer.unresolved_questions).toEqual([]);
    expect(afterAnswer.canvas_state.flow_steps.some((step) => /Finance Lead/.test(step.label))).toBe(true);
    expect(afterAnswer.deploy_ready).toBe(true);
    expect(afterAnswer.deploy_readiness_reasons).toEqual([]);
  });

  it("returns deploy_ready=false with reasons when confidence and unresolved blockers fail", () => {
    const response = processIntentEvent({
      intent_event: normalizeAddApprovalStepIntent(),
      canvas_state: getDefaultCanvasState()
    });

    expect(response.deploy_ready).toBe(false);
    expect(response.deploy_readiness_reasons).toEqual([
      "Resolve unresolved questions before deploy (1 remaining)."
    ]);
  });

  it("returns deploy_ready=false when sheet headers do not match form field mapping rules", () => {
    const response = processIntentEvent({
      intent_event: {
        id: "evt-mapping-check",
        source: "card",
        intent_type: "add_field",
        payload: {},
        timestamp_iso: "2026-02-28T12:00:00Z"
      },
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [
          { type: "SHORT_TEXT", label: "Employee name", required: true },
          { type: "DATE", label: "Expense date", required: true },
          { type: "PARAGRAPH", label: "Business justification", required: true }
        ],
        sheet_headers: ["Timestamp", "Expense date", "Employee name", "Business justification", "Edit Link"],
        flow_steps: [
          { id: "start", label: "Request Input", type: "input" },
          { id: "approval", label: "Manager Approval (>5000): Finance Lead", type: "process" },
          { id: "submit", label: "Approved Submission", type: "output" }
        ]
      }
    });

    expect(response.confidence).toBe(0.95);
    expect(response.unresolved_questions).toEqual([]);
    expect(response.deploy_ready).toBe(false);
    expect(response.deploy_readiness_reasons).toEqual([
      "Sheet headers must follow mapping rule: Timestamp, form field labels, Edit Link."
    ]);
  });

  it("applies template intents through the same pipeline", () => {
    const response = processIntentEvent({
      intent_event: normalizeTemplateIntent("it-access-request"),
      canvas_state: getDefaultCanvasState()
    });

    expect(response.canvas_state.process_name).toBe("IT Access Request");
    expect(response.chat_reply).toContain("template remix");
    expect(response.deploy_ready).toBe(false);
    expect(response.deploy_readiness_reasons).toEqual([
      "Confidence 65% is below 75% readiness threshold."
    ]);
    expect(response).toHaveProperty("deploy_ready");
    expect(response).toHaveProperty("deploy_readiness_reasons");
  });
});
