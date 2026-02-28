import { describe, expect, it } from "vitest";

import { evaluateDeployReadiness } from "@/lib/intent/deploy-readiness";
import { getDefaultCanvasState } from "@/lib/workspace/templates";

describe("deploy readiness evaluator", () => {
  it("returns ready when confidence, unresolved questions, and mapping checks pass", () => {
    const result = evaluateDeployReadiness({
      confidence: 0.8,
      unresolved_questions: [],
      canvas_state: getDefaultCanvasState()
    });

    expect(result.deploy_ready).toBe(true);
    expect(result.deploy_readiness_reasons).toEqual([]);
  });

  it("returns not ready when confidence is below threshold", () => {
    const result = evaluateDeployReadiness({
      confidence: 0.74,
      unresolved_questions: [],
      canvas_state: getDefaultCanvasState()
    });

    expect(result.deploy_ready).toBe(false);
    expect(result.deploy_readiness_reasons).toContain("Confidence below deployment threshold (0.75).");
  });

  it("returns not ready when unresolved questions remain", () => {
    const result = evaluateDeployReadiness({
      confidence: 0.9,
      unresolved_questions: ["Who approves requests above 5000?"],
      canvas_state: getDefaultCanvasState()
    });

    expect(result.deploy_ready).toBe(false);
    expect(result.deploy_readiness_reasons).toContain("Critical unresolved questions remain.");
  });

  it("returns not ready when sheet headers do not match field mapping", () => {
    const canvasState = getDefaultCanvasState();
    canvasState.sheet_headers = ["Timestamp", "Employee name", "Edit Link"];

    const result = evaluateDeployReadiness({
      confidence: 0.9,
      unresolved_questions: [],
      canvas_state: canvasState
    });

    expect(result.deploy_ready).toBe(false);
    expect(result.deploy_readiness_reasons).toContain(
      "Sheet headers do not match form field mapping requirements."
    );
  });

  it("returns multiple reasons when multiple checks fail", () => {
    const canvasState = getDefaultCanvasState();
    canvasState.sheet_headers = ["Timestamp", "Edit Link"];

    const result = evaluateDeployReadiness({
      confidence: 0.6,
      unresolved_questions: ["Who approves requests above 5000?"],
      canvas_state: canvasState
    });

    expect(result.deploy_ready).toBe(false);
    expect(result.deploy_readiness_reasons).toEqual([
      "Confidence below deployment threshold (0.75).",
      "Critical unresolved questions remain.",
      "Sheet headers do not match form field mapping requirements."
    ]);
  });

  it("returns ready only when there are zero reasons", () => {
    const ready = evaluateDeployReadiness({
      confidence: 0.95,
      unresolved_questions: [],
      canvas_state: getDefaultCanvasState()
    });
    const blocked = evaluateDeployReadiness({
      confidence: 0.95,
      unresolved_questions: ["pending"],
      canvas_state: getDefaultCanvasState()
    });

    expect(ready.deploy_readiness_reasons).toHaveLength(0);
    expect(ready.deploy_ready).toBe(true);
    expect(blocked.deploy_readiness_reasons.length).toBeGreaterThan(0);
    expect(blocked.deploy_ready).toBe(false);
  });
});

