import { describe, expect, test, vi } from "vitest";

import type { AssistantResponse } from "@/lib/contracts";
import { createIntentHandler } from "@/lib/server/intent/handler";
import type { IntentRequest } from "@/lib/server/intent/schemas";
import { IntentSuccessEnvelopeSchema } from "@/lib/server/intent/schemas";

function buildValidIntentRequest(): IntentRequest {
  return {
    session_id: "sess-123",
    intent_event: {
      id: "evt-123",
      source: "chat",
      intent_type: "add_field",
      payload: {
        field_label: "Requester Name"
      },
      timestamp_iso: "2026-02-28T12:00:00Z"
    },
    canvas_state: {
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
    }
  };
}

function buildValidAssistantResponse(): AssistantResponse {
  return {
    chat_reply: "Added Requester Name.",
    canvas_state: {
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
    },
    canvas_state_patch: [],
    confidence: 0.9,
    unresolved_questions: [],
    next_actions: ["Add approver field"]
  };
}

describe("intent handler", () => {
  test("returns INVALID_SCHEMA for malformed body", async () => {
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent: vi.fn().mockResolvedValue(buildValidAssistantResponse()),
      requestIdFactory: () => "req-invalid"
    });

    const result = await handler({
      rawBody: { session_id: "" },
      auth: { user_id: "user-123" }
    });

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("INVALID_SCHEMA");
    expect(result.body.error.request_id).toBe("req-invalid");
  });

  test("returns UNAUTHORIZED when auth is missing", async () => {
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent: vi.fn().mockResolvedValue(buildValidAssistantResponse()),
      requestIdFactory: () => "req-unauthorized"
    });

    const result = await handler({
      rawBody: buildValidIntentRequest(),
      auth: { user_id: null }
    });

    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("UNAUTHORIZED");
    expect(result.body.error.request_id).toBe("req-unauthorized");
  });

  test("returns FORBIDDEN when session authorization fails", async () => {
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(false),
      processIntent: vi.fn().mockResolvedValue(buildValidAssistantResponse()),
      requestIdFactory: () => "req-forbidden"
    });

    const result = await handler({
      rawBody: buildValidIntentRequest(),
      auth: { user_id: "user-123" }
    });

    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("FORBIDDEN");
    expect(result.body.error.request_id).toBe("req-forbidden");
    expect(result.body.error.details.reason).toBe("session_access_denied");
  });

  test("returns INTERNAL_ERROR with unexpected_error reason when processIntent throws", async () => {
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent: vi.fn().mockRejectedValue(new Error("model unavailable")),
      requestIdFactory: () => "req-process-throws"
    });

    const result = await handler({
      rawBody: buildValidIntentRequest(),
      auth: { user_id: "user-123" }
    });

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
    expect(result.body.error.request_id).toBe("req-process-throws");
    expect(result.body.error.details.reason).toBe("unexpected_error");
  });

  test("returns INTERNAL_ERROR with invalid_assistant_response when success envelope validation fails", async () => {
    const failure = IntentSuccessEnvelopeSchema.safeParse({});
    if (failure.success) {
      throw new Error("expected fixture parse to fail");
    }

    const safeParseSpy = vi
      .spyOn(IntentSuccessEnvelopeSchema, "safeParse")
      .mockReturnValueOnce({ success: false, error: failure.error });

    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent: vi.fn().mockResolvedValue(buildValidAssistantResponse()),
      requestIdFactory: () => "req-invalid-assistant-response"
    });

    const result = await handler({
      rawBody: buildValidIntentRequest(),
      auth: { user_id: "user-123" }
    });

    safeParseSpy.mockRestore();

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
    expect(result.body.error.request_id).toBe("req-invalid-assistant-response");
    expect(result.body.error.details.reason).toBe("invalid_assistant_response");
    expect(result.body.error.details.issues).toBeDefined();
  });

  test("returns success envelope for valid authorized request", async () => {
    const processIntent = vi.fn().mockResolvedValue(buildValidAssistantResponse());
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent
    });

    const request = buildValidIntentRequest();
    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    expect(result.status).toBe(200);
    expect(result.body.session_id).toBe("sess-123");
    expect(result.body.response.chat_reply).toBe("Added Requester Name.");
    expect(processIntent).toHaveBeenCalledWith({
      request,
      access: {
        user_id: "user-123",
        session_id: "sess-123"
      }
    });
  });
});
