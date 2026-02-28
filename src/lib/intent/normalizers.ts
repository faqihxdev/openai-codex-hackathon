import type { IntentEvent, IntentSource, IntentType } from "@/lib/contracts/intent-event";
import { IntentEventSchema } from "@/lib/contracts/intent-event";

export const APPROVER_QUESTION_KEY = "approver_over_5000";
export const APPROVER_QUESTION = "Who approves requests above 5000?";
export const BUSINESS_JUSTIFICATION_LABEL = "Business justification";
export const DEFAULT_APPROVAL_THRESHOLD = 5000;

export function createIntentEvent(
  source: IntentSource,
  intentType: IntentType,
  payload: Record<string, unknown>
): IntentEvent {
  return IntentEventSchema.parse({
    id: crypto.randomUUID(),
    source,
    intent_type: intentType,
    payload,
    timestamp_iso: new Date().toISOString()
  });
}

export function normalizeChatIntent(message: string): IntentEvent {
  return createIntentEvent("chat", "set_constraint", {
    message: message.trim()
  });
}

export function normalizeAddApprovalStepIntent(): IntentEvent {
  return createIntentEvent("card", "add_step", {
    action: "add_approval_step",
    step: {
      id: "approval",
      label: `Manager Approval (>${DEFAULT_APPROVAL_THRESHOLD})`,
      type: "process"
    }
  });
}

export function normalizeMarkBusinessJustificationRequiredIntent(): IntentEvent {
  return createIntentEvent("card", "update_field", {
    action: "mark_required",
    field_label: BUSINESS_JUSTIFICATION_LABEL,
    required: true
  });
}

export function normalizeSetApprovalThresholdIntent(threshold: number | null): IntentEvent {
  return createIntentEvent("card", "set_constraint", {
    action: "set_approval_threshold",
    threshold
  });
}

export function normalizeAnswerApproverIntent(answer: string): IntentEvent {
  return createIntentEvent("card", "answer_question", {
    question_key: APPROVER_QUESTION_KEY,
    answer: answer.trim()
  });
}

export function normalizeTemplateIntent(templateId: string): IntentEvent {
  return createIntentEvent("template", "set_constraint", {
    action: "apply_template",
    template_id: templateId
  });
}

export function normalizeCanvasAddStepIntent(label: string): IntentEvent {
  return createIntentEvent("canvas", "add_step", {
    action: "add_canvas_step",
    step: {
      id: `step-${Date.now()}`,
      label: label.trim(),
      type: "process"
    }
  });
}

export function normalizeCanvasRenameStepIntent(stepId: string, label: string): IntentEvent {
  return createIntentEvent("canvas", "update_field", {
    action: "rename_step",
    step_id: stepId,
    label: label.trim()
  });
}

export function normalizeCanvasRemoveStepIntent(stepId: string): IntentEvent {
  return createIntentEvent("canvas", "remove_step", {
    action: "remove_step",
    step_id: stepId
  });
}
