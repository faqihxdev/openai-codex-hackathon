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

    const afterAnswer = processIntentEvent({
      intent_event: normalizeAnswerApproverIntent("Finance Lead"),
      canvas_state: afterStep.canvas_state
    });

    expect(afterAnswer.unresolved_questions).toEqual([]);
    expect(afterAnswer.canvas_state.flow_steps.some((step) => /Finance Lead/.test(step.label))).toBe(true);
  });

  it("applies template intents through the same pipeline", () => {
    const response = processIntentEvent({
      intent_event: normalizeTemplateIntent("it-access-request"),
      canvas_state: getDefaultCanvasState()
    });

    expect(response.canvas_state.process_name).toBe("IT Access Request");
    expect(response.chat_reply).toContain("template remix");
  });
});
