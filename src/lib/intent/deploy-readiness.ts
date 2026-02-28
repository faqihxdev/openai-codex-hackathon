import type { CanvasState } from "@/lib/contracts/canvas-state";

export const DEPLOY_CONFIDENCE_THRESHOLD = 0.75;
export const LOW_CONFIDENCE_REASON = `Confidence below deployment threshold (${DEPLOY_CONFIDENCE_THRESHOLD}).`;
export const UNRESOLVED_QUESTIONS_REASON = "Critical unresolved questions remain.";
export const INVALID_MAPPING_REASON = "Sheet headers do not match form field mapping requirements.";

export type DeployReadinessInput = {
  confidence: number;
  unresolved_questions: string[];
  canvas_state: CanvasState;
};

export type DeployReadinessResult = {
  deploy_ready: boolean;
  deploy_readiness_reasons: string[];
};

function hasValidFieldHeaderMapping(canvasState: CanvasState): boolean {
  const expectedHeaders = [
    "Timestamp",
    ...canvasState.form_fields.map((field) => field.label),
    "Edit Link"
  ];

  if (canvasState.sheet_headers.length !== expectedHeaders.length) {
    return false;
  }

  return canvasState.sheet_headers.every((header, index) => header === expectedHeaders[index]);
}

function findDuplicateLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const label of labels) {
    if (seen.has(label)) {
      duplicates.add(label);
      continue;
    }
    seen.add(label);
  }

  return [...duplicates];
}

export function evaluateDeployReadiness(input: DeployReadinessInput): DeployReadinessResult {
  const reasons: string[] = [];

  if (input.confidence < DEPLOY_CONFIDENCE_THRESHOLD) {
    reasons.push(LOW_CONFIDENCE_REASON);
  }

  if (input.unresolved_questions.length > 0) {
    reasons.push(UNRESOLVED_QUESTIONS_REASON);
  }

  if (!hasValidFieldHeaderMapping(input.canvas_state)) {
    reasons.push(INVALID_MAPPING_REASON);
  }

  const duplicateFieldLabels = findDuplicateLabels(
    input.canvas_state.form_fields.map((field) => field.label)
  );
  if (duplicateFieldLabels.length > 0) {
    reasons.push(`Form field labels must be unique for sheet mapping: ${duplicateFieldLabels.join(", ")}.`);
  }

  return {
    deploy_ready: reasons.length === 0,
    deploy_readiness_reasons: reasons
  };
}
