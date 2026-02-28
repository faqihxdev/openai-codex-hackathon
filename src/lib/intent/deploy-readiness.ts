import type { CanvasState } from "@/lib/contracts/canvas-state";

export const DEPLOY_CONFIDENCE_THRESHOLD = 0.75;

const LOW_CONFIDENCE_REASON = `Confidence below deployment threshold (${DEPLOY_CONFIDENCE_THRESHOLD}).`;
const UNRESOLVED_QUESTIONS_REASON = "Critical unresolved questions remain.";
const INVALID_MAPPING_REASON = "Sheet headers do not match form field mapping requirements.";

type DeployReadinessInput = {
  confidence: number;
  unresolved_questions: string[];
  canvas_state: CanvasState;
};

type DeployReadinessResult = {
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

  return expectedHeaders.every((header, index) => canvasState.sheet_headers[index] === header);
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

  return {
    deploy_ready: reasons.length === 0,
    deploy_readiness_reasons: reasons
  };
}

