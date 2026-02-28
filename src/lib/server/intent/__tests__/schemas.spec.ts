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
        next_actions: ["Add approver field"]
      }
    });

    expect(parsed.success).toBe(true);
  });
});
