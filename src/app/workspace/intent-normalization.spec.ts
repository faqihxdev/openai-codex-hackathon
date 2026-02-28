import { describe, expect, it } from "vitest";

import { IntentEventSchema } from "@/lib/contracts/intent-event";
import {
  normalizeAddApprovalStepIntent,
  normalizeAnswerApproverIntent,
  normalizeCanvasAddStepIntent,
  normalizeCanvasRemoveStepIntent,
  normalizeCanvasRenameStepIntent,
  normalizeChatIntent,
  normalizeMarkBusinessJustificationRequiredIntent,
  normalizeSetApprovalThresholdIntent,
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

  it("normalizes card field requirements into a valid intent_event", () => {
    const intentEvent = normalizeMarkBusinessJustificationRequiredIntent();
    const parsed = IntentEventSchema.parse(intentEvent);

    expect(parsed.source).toBe("card");
    expect(parsed.intent_type).toBe("update_field");
    expect(parsed.payload.field_label).toBe("Business justification");
    expect(parsed.payload.required).toBe(true);
  });

  it("normalizes card threshold controls into a valid intent_event", () => {
    const setThreshold = IntentEventSchema.parse(normalizeSetApprovalThresholdIntent(8000));
    const clearThreshold = IntentEventSchema.parse(normalizeSetApprovalThresholdIntent(null));

    expect(setThreshold.source).toBe("card");
    expect(setThreshold.intent_type).toBe("set_constraint");
    expect(setThreshold.payload.threshold).toBe(8000);
    expect(clearThreshold.payload.threshold).toBeNull();
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

  it("normalizes canvas rename/remove edits into valid intent_event payloads", () => {
    const renameEvent = IntentEventSchema.parse(normalizeCanvasRenameStepIntent("approval", "Legal Review"));
    const removeEvent = IntentEventSchema.parse(normalizeCanvasRemoveStepIntent("approval"));

    expect(renameEvent.source).toBe("canvas");
    expect(renameEvent.intent_type).toBe("update_field");
    expect(renameEvent.payload.step_id).toBe("approval");
    expect(renameEvent.payload.label).toBe("Legal Review");

    expect(removeEvent.source).toBe("canvas");
    expect(removeEvent.intent_type).toBe("remove_step");
    expect(removeEvent.payload.step_id).toBe("approval");
  });
});
