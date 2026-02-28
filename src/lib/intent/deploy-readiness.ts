import type { CanvasState } from "@/lib/contracts/canvas-state";

export const DEPLOY_READY_CONFIDENCE_THRESHOLD = 0.75;

interface DeployReadinessInput {
  canvas_state: CanvasState;
  confidence: number;
  unresolved_questions: string[];
}

interface DeployReadinessEvaluation {
  deploy_ready: boolean;
  deploy_readiness_reasons: string[];
}

function formatPercent(value: number): number {
  return Math.round(value * 100);
}

function buildExpectedHeaders(canvasState: CanvasState): string[] {
  return ["Timestamp", ...canvasState.form_fields.map((field) => field.label), "Edit Link"];
}

function hasExpectedHeaderMapping(canvasState: CanvasState): boolean {
  const expectedHeaders = buildExpectedHeaders(canvasState);
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

export function evaluateDeployReadiness(input: DeployReadinessInput): DeployReadinessEvaluation {
  const reasons: string[] = [];
  const confidenceThreshold = DEPLOY_READY_CONFIDENCE_THRESHOLD;

  if (input.confidence < confidenceThreshold) {
    reasons.push(
      `Confidence ${formatPercent(input.confidence)}% is below ${formatPercent(confidenceThreshold)}% readiness threshold.`
    );
  }

  if (input.unresolved_questions.length > 0) {
    reasons.push(`Resolve unresolved questions before deploy (${input.unresolved_questions.length} remaining).`);
  }

  const duplicateFieldLabels = findDuplicateLabels(
    input.canvas_state.form_fields.map((field) => field.label)
  );
  if (duplicateFieldLabels.length > 0) {
    reasons.push(`Form field labels must be unique for sheet mapping: ${duplicateFieldLabels.join(", ")}.`);
  }

  if (!hasExpectedHeaderMapping(input.canvas_state)) {
    reasons.push("Sheet headers must follow mapping rule: Timestamp, form field labels, Edit Link.");
  }

  return {
    deploy_ready: reasons.length === 0,
    deploy_readiness_reasons: reasons
  };
}

export type { DeployReadinessEvaluation, DeployReadinessInput };
