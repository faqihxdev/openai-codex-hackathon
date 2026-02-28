import type { AssistantResponse, CanvasStatePatch } from "@/lib/contracts/assistant-response";
import { AssistantResponseSchema } from "@/lib/contracts/assistant-response";
import type { CanvasState, FlowStep } from "@/lib/contracts/canvas-state";
import type { IntentEvent } from "@/lib/contracts/intent-event";
import {
  APPROVER_QUESTION,
  BUSINESS_JUSTIFICATION_LABEL,
  DEFAULT_APPROVAL_THRESHOLD
} from "@/lib/intent/normalizers";
import { evaluateDeployReadiness } from "@/lib/intent/deploy-readiness";
import { cloneCanvasState, getTemplateById } from "@/lib/workspace/templates";

export interface IntentPipelineRequest {
  intent_event: IntentEvent;
  canvas_state: CanvasState;
  conversation_context?: {
    unresolved_questions?: string[];
    previous_confidence?: number;
  };
}

function ensureApprovalStep(flowSteps: FlowStep[], threshold: number = DEFAULT_APPROVAL_THRESHOLD): FlowStep[] {
  const existingIndex = flowSteps.findIndex((step) => /approval/i.test(step.label));
  if (existingIndex >= 0) {
    const existingStep = flowSteps[existingIndex];
    const approverSuffix = extractApproverSuffix(existingStep.label);
    const nextLabel = approverSuffix
      ? `Manager Approval (>${threshold}): ${approverSuffix}`
      : `Manager Approval (>${threshold})`;
    if (existingStep.label === nextLabel) {
      return flowSteps;
    }
    const nextSteps = [...flowSteps];
    nextSteps[existingIndex] = { ...existingStep, label: nextLabel };
    return nextSteps;
  }

  const insertionStep: FlowStep = {
    id: "approval",
    label: `Manager Approval (>${threshold})`,
    type: "process"
  };
  const outputIndex = flowSteps.findIndex((step) => step.type === "output");
  const insertionIndex = outputIndex > -1 ? outputIndex : flowSteps.length;
  return [...flowSteps.slice(0, insertionIndex), insertionStep, ...flowSteps.slice(insertionIndex)];
}

function extractApproverSuffix(label: string): string | null {
  const match = label.match(/:\s*(.+)$/);
  return match?.[1]?.trim() || null;
}

function extractThreshold(label: string): number | null {
  const match = label.match(/>\s*(\d+)/);
  if (!match?.[1]) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

function setApprover(flowSteps: FlowStep[], approver: string): FlowStep[] {
  const safeApprover = approver.trim();
  if (!safeApprover) {
    return flowSteps;
  }

  const approvalIndex = flowSteps.findIndex((step) => /approval/i.test(step.label));
  const threshold =
    approvalIndex >= 0 ? (extractThreshold(flowSteps[approvalIndex].label) ?? DEFAULT_APPROVAL_THRESHOLD) : DEFAULT_APPROVAL_THRESHOLD;
  const seededSteps = ensureApprovalStep(flowSteps, threshold);
  const updatedIndex = seededSteps.findIndex((step) => /approval/i.test(step.label));

  if (updatedIndex < 0) {
    return seededSteps;
  }

  const nextSteps = [...seededSteps];
  nextSteps[updatedIndex] = {
    ...nextSteps[updatedIndex],
    label: `Manager Approval (>${threshold}): ${safeApprover}`
  };
  return nextSteps;
}

function clearApprovalThreshold(flowSteps: FlowStep[]): FlowStep[] {
  const approvalIndex = flowSteps.findIndex((step) => /approval/i.test(step.label));
  if (approvalIndex < 0) {
    return flowSteps;
  }
  const nextSteps = [...flowSteps];
  const approver = extractApproverSuffix(nextSteps[approvalIndex].label);
  nextSteps[approvalIndex] = {
    ...nextSteps[approvalIndex],
    label: approver ? `Manager Approval: ${approver}` : "Manager Approval"
  };
  return nextSteps;
}

function applyChatHeuristics(canvasState: CanvasState, message: string): CanvasState {
  const lowered = message.toLowerCase();
  const next = cloneCanvasState(canvasState);

  if (lowered.includes("approval")) {
    next.flow_steps = ensureApprovalStep(next.flow_steps);
  }

  if (lowered.includes("business justification") && lowered.includes("required")) {
    next.form_fields = next.form_fields.map((field) =>
      field.label === BUSINESS_JUSTIFICATION_LABEL ? { ...field, required: true } : field
    );
  }

  const thresholdMatch = lowered.match(/above\s+(\d+)/);
  if (thresholdMatch?.[1]) {
    const threshold = Number.parseInt(thresholdMatch[1], 10);
    if (!Number.isNaN(threshold)) {
      next.flow_steps = ensureApprovalStep(next.flow_steps, threshold);
    }
  }

  const approverMatch = message.match(/(?:approver is|approved by)\s+([A-Za-z0-9\s-]+)/i);
  if (approverMatch?.[1]) {
    next.flow_steps = setApprover(next.flow_steps, approverMatch[1]);
  }

  return next;
}

function isFlowStepCandidate(step: unknown): step is FlowStep {
  if (!step || typeof step !== "object") {
    return false;
  }

  const candidate = step as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    (candidate.type === "input" || candidate.type === "process" || candidate.type === "output")
  );
}

function applyIntentEvent(canvasState: CanvasState, intentEvent: IntentEvent): CanvasState {
  const next = cloneCanvasState(canvasState);
  const payload = intentEvent.payload;

  if (intentEvent.source === "template" && typeof payload.template_id === "string") {
    const template = getTemplateById(payload.template_id);
    if (template) {
      return cloneCanvasState(template.canvas_state);
    }
  }

  switch (intentEvent.intent_type) {
    case "add_step": {
      const step = payload.step;
      if (isFlowStepCandidate(step)) {
        if (!next.flow_steps.some((existingStep) => existingStep.id === step.id)) {
          next.flow_steps.push(step);
        }
      } else if (payload.action === "add_approval_step") {
        next.flow_steps = ensureApprovalStep(next.flow_steps);
      }
      return next;
    }
    case "remove_step": {
      const stepId = payload.step_id;
      if (typeof stepId === "string" && next.flow_steps.length > 1) {
        next.flow_steps = next.flow_steps.filter((step) => step.id !== stepId);
      }
      return next;
    }
    case "update_field": {
      const fieldLabel = payload.field_label;
      const required = payload.required;
      if (typeof fieldLabel === "string" && typeof required === "boolean") {
        next.form_fields = next.form_fields.map((field) =>
          field.label === fieldLabel ? { ...field, required } : field
        );
      }

      const stepId = payload.step_id;
      const label = payload.label;
      if (typeof stepId === "string" && typeof label === "string") {
        next.flow_steps = next.flow_steps.map((step) => (step.id === stepId ? { ...step, label } : step));
      }
      return next;
    }
    case "answer_question": {
      if (typeof payload.answer === "string") {
        next.flow_steps = setApprover(next.flow_steps, payload.answer);
      }
      return next;
    }
    case "set_constraint": {
      if (intentEvent.source === "chat" && typeof payload.message === "string") {
        return applyChatHeuristics(next, payload.message);
      }

      if (typeof payload.threshold === "number") {
        next.flow_steps = ensureApprovalStep(next.flow_steps, payload.threshold);
      }

      if (payload.threshold === null) {
        next.flow_steps = clearApprovalThreshold(next.flow_steps);
      }

      return next;
    }
    case "add_field":
    default:
      return next;
  }
}

function isBusinessJustificationRequired(canvasState: CanvasState): boolean {
  return canvasState.form_fields.some(
    (field) => field.label === BUSINESS_JUSTIFICATION_LABEL && field.required
  );
}

function getApprovalMetadata(canvasState: CanvasState): {
  hasApprovalStep: boolean;
  hasApprover: boolean;
} {
  const approvalStep = canvasState.flow_steps.find((step) => /approval/i.test(step.label));
  if (!approvalStep) {
    return {
      hasApprovalStep: false,
      hasApprover: false
    };
  }

  return {
    hasApprovalStep: true,
    hasApprover: Boolean(extractApproverSuffix(approvalStep.label))
  };
}

function deriveUnresolvedQuestions(canvasState: CanvasState): string[] {
  const { hasApprovalStep, hasApprover } = getApprovalMetadata(canvasState);
  if (hasApprovalStep && !hasApprover) {
    return [APPROVER_QUESTION];
  }
  return [];
}

function deriveNextActions(canvasState: CanvasState, unresolvedQuestions: string[]): string[] {
  const { hasApprovalStep } = getApprovalMetadata(canvasState);
  const actions: string[] = [];

  if (!hasApprovalStep) {
    actions.push("Add approval step");
  }
  if (unresolvedQuestions.includes(APPROVER_QUESTION)) {
    actions.push("Answer approver question");
  }
  if (!isBusinessJustificationRequired(canvasState)) {
    actions.push("Mark business justification as required");
  }
  if (unresolvedQuestions.length === 0) {
    actions.push("Deploy");
  }

  return actions.slice(0, 4);
}

function deriveConfidence(canvasState: CanvasState, unresolvedQuestions: string[]): number {
  const { hasApprovalStep, hasApprover } = getApprovalMetadata(canvasState);
  let confidence = 0.58;

  if (hasApprovalStep) {
    confidence += 0.14;
  }
  if (hasApprover) {
    confidence += 0.16;
  }
  if (isBusinessJustificationRequired(canvasState)) {
    confidence += 0.08;
  }
  if (unresolvedQuestions.length === 0) {
    confidence += 0.07;
  }

  return Number(Math.min(0.95, confidence).toFixed(2));
}

function buildPatch(previousCanvasState: CanvasState, nextCanvasState: CanvasState): CanvasStatePatch[] {
  const patch: CanvasStatePatch[] = [];

  if (previousCanvasState.process_name !== nextCanvasState.process_name) {
    patch.push({
      op: "replace",
      path: "/process_name",
      value: nextCanvasState.process_name
    });
  }

  if (JSON.stringify(previousCanvasState.flow_steps) !== JSON.stringify(nextCanvasState.flow_steps)) {
    patch.push({
      op: "replace",
      path: "/flow_steps",
      value: nextCanvasState.flow_steps
    });
  }

  if (JSON.stringify(previousCanvasState.form_fields) !== JSON.stringify(nextCanvasState.form_fields)) {
    patch.push({
      op: "replace",
      path: "/form_fields",
      value: nextCanvasState.form_fields
    });
  }

  if (JSON.stringify(previousCanvasState.sheet_headers) !== JSON.stringify(nextCanvasState.sheet_headers)) {
    patch.push({
      op: "replace",
      path: "/sheet_headers",
      value: nextCanvasState.sheet_headers
    });
  }

  return patch;
}

function buildChatReply(intentEvent: IntentEvent, unresolvedQuestions: string[]): string {
  const modeMap: Record<IntentEvent["source"], string> = {
    chat: "chat input",
    card: "guided controls",
    canvas: "canvas edits",
    template: "template remix",
    voice: "voice input"
  };

  const mode = modeMap[intentEvent.source];
  if (unresolvedQuestions.length > 0) {
    return `Applied update from ${mode}. ${unresolvedQuestions[0]}`;
  }
  return `Applied update from ${mode}. The workflow is ready for deployment checks.`;
}

export function processIntentEvent(request: IntentPipelineRequest): AssistantResponse {
  const nextCanvasState = applyIntentEvent(request.canvas_state, request.intent_event);
  const unresolvedQuestions = deriveUnresolvedQuestions(nextCanvasState);
  const nextActions = deriveNextActions(nextCanvasState, unresolvedQuestions);
  const confidence = deriveConfidence(nextCanvasState, unresolvedQuestions);
  const deployReadiness = evaluateDeployReadiness({
    canvas_state: nextCanvasState,
    confidence,
    unresolved_questions: unresolvedQuestions
  });

  return AssistantResponseSchema.parse({
    chat_reply: buildChatReply(request.intent_event, unresolvedQuestions),
    canvas_state: nextCanvasState,
    canvas_state_patch: buildPatch(request.canvas_state, nextCanvasState),
    confidence,
    unresolved_questions: unresolvedQuestions,
    next_actions: nextActions,
    deploy_ready: deployReadiness.deploy_ready,
    deploy_readiness_reasons: deployReadiness.deploy_readiness_reasons
  });
}
