import { describe, expect, it } from "vitest";

import { IntentEventSchema } from "@/lib/contracts/intent-event";
import {
  normalizeAddApprovalStepIntent,
  normalizeAnswerApproverIntent,
  normalizeCanvasAddStepIntent,
  normalizeChatIntent,
  normalizeTemplateIntent
} from "@/lib/intent/normalizers";

describe("intent normalization", () => {
  it("normalizes chat input into a valid intent_event", () => {
    const intentEvent = normalizeChatIntent("approved by Finance Lead");
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("chat");
    expect(parsed.intent_type).toBe("set_constraint");
    expect(parsed.payload.message).toBe("approved by Finance Lead");
  });

  it("normalizes card quick actions into a valid intent_event", () => {
    const intentEvent = normalizeAddApprovalStepIntent();
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("card");
    expect(parsed.intent_type).toBe("add_step");
    expect(parsed.payload.action).toBe("add_approval_step");
  });

  it("normalizes question answers into a valid intent_event", () => {
    const intentEvent = normalizeAnswerApproverIntent("Finance Lead");
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("card");
    expect(parsed.intent_type).toBe("answer_question");
    expect(parsed.payload.answer).toBe("Finance Lead");
  });

  it("normalizes template selection into a valid intent_event", () => {
    const intentEvent = normalizeTemplateIntent("expense-approval");
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("template");
    expect(parsed.intent_type).toBe("set_constraint");
    expect(parsed.payload.template_id).toBe("expense-approval");
  });

  it("normalizes canvas edits into a valid intent_event", () => {
    const intentEvent = normalizeCanvasAddStepIntent("Review Request");
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("canvas");
    expect(parsed.intent_type).toBe("add_step");
    expect(parsed.payload.step).toBeTypeOf("object");
  });
});
