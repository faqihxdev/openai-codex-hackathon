import { describe, expect, test } from "vitest";

import {
  IntentRequestSchema,
  IntentSuccessEnvelopeSchema
} from "@/lib/server/intent/schemas";

const canonicalIntentEvent = {
  id: "evt-123",
  source: "chat",
  intent_type: "add_field",
  payload: {
    field_label: "Requester Name"
  },
  timestamp_iso: "2026-02-28T12:00:00Z"
};

const canonicalCanvasState = {
  process_name: "Expense Approval",
  form_fields: [
    {
      type: "SHORT_TEXT",
      label: "Requester Name",
      required: true
    }
  ],
  sheet_headers: ["Timestamp", "Requester Name", "Edit Link"],
  flow_steps: [
    {
      id: "node-1",
      label: "Submit Request",
      type: "input"
    }
  ]
};

describe("intent endpoint schemas", () => {
  test("accepts canonical request payload", () => {
    const parsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: canonicalIntentEvent,
      canvas_state: canonicalCanvasState,
      conversation_context: {
        unresolved_questions: ["What approval threshold should apply?"],
        previous_confidence: 0.6
      }
    });

    expect(parsed.success).toBe(true);
  });

  test("rejects unknown keys on request", () => {
    const parsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: canonicalIntentEvent,
      canvas_state: canonicalCanvasState,
      extra_field: "drift"
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("expected request schema validation to fail");
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: []
        })
      ])
    );
  });

  test("rejects unknown keys inside intent_event with actionable issue metadata", () => {
    const parsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: {
        ...canonicalIntentEvent,
        unexpected: "drift"
      },
      canvas_state: canonicalCanvasState
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("expected request schema validation to fail");
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: ["intent_event"]
        })
      ])
    );
  });

  test("rejects unknown nested keys inside canvas_state", () => {
    const parsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: canonicalIntentEvent,
      canvas_state: {
        ...canonicalCanvasState,
        form_fields: [
          {
            ...canonicalCanvasState.form_fields[0],
            rogue: true
          }
        ]
      }
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("expected request schema validation to fail");
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: ["canvas_state", "form_fields", 0]
        })
      ])
    );
  });

  test("rejects out-of-range previous_confidence in conversation_context", () => {
    const lowParsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: canonicalIntentEvent,
      canvas_state: canonicalCanvasState,
      conversation_context: {
        unresolved_questions: [],
        previous_confidence: -0.01
      }
    });
    const highParsed = IntentRequestSchema.safeParse({
      session_id: "sess-123",
      intent_event: canonicalIntentEvent,
      canvas_state: canonicalCanvasState,
      conversation_context: {
        unresolved_questions: [],
        previous_confidence: 1.01
      }
    });

    expect(lowParsed.success).toBe(false);
    expect(highParsed.success).toBe(false);
  });

  test("accepts strict success envelope", () => {
    const parsed = IntentSuccessEnvelopeSchema.safeParse({
      session_id: "sess-123",
      response: {
        chat_reply: "Added Requester Name.",
        canvas_state: canonicalCanvasState,
        canvas_state_patch: [],
        confidence: 0.9,
        unresolved_questions: [],
        next_actions: ["Add approver field"],
        deploy_ready: true,
        deploy_readiness_reasons: []
      }
    });

    expect(parsed.success).toBe(true);
  });

  test("rejects unknown top-level keys on success envelope", () => {
    const parsed = IntentSuccessEnvelopeSchema.safeParse({
      session_id: "sess-123",
      response: {
        chat_reply: "Added Requester Name.",
        canvas_state: canonicalCanvasState,
        canvas_state_patch: [],
        confidence: 0.9,
        unresolved_questions: [],
        next_actions: ["Add approver field"],
        deploy_ready: true,
        deploy_readiness_reasons: []
      },
      extra: "drift"
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("expected response schema validation to fail");
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: []
        })
      ])
    );
  });

  test("rejects unknown nested keys inside response.canvas_state with actionable metadata", () => {
    const parsed = IntentSuccessEnvelopeSchema.safeParse({
      session_id: "sess-123",
      response: {
        chat_reply: "Added Requester Name.",
        canvas_state: {
          ...canonicalCanvasState,
          flow_steps: [
            {
              ...canonicalCanvasState.flow_steps[0],
              rogue: "value"
            }
          ]
        },
        canvas_state_patch: [],
        confidence: 0.9,
        unresolved_questions: [],
        next_actions: ["Add approver field"],
        deploy_ready: true,
        deploy_readiness_reasons: []
      }
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("expected response schema validation to fail");
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          path: ["response", "canvas_state", "flow_steps", 0]
        })
      ])
    );
  });
});
