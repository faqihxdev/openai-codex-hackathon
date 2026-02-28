import { describe, expect, test, vi } from "vitest";

import type { AssistantResponse } from "@/lib/contracts";
import {
  createIntentHandler,
  type IntentHandlerErrorResult,
  type IntentHandlerResult,
  type IntentHandlerSuccessResult
} from "@/lib/server/intent/handler";
import type { IntentRequest } from "@/lib/server/intent/schemas";

function assertErrorResult(
  result: IntentHandlerResult,
  expectedStatus: number
): asserts result is IntentHandlerErrorResult {
  expect(result.status).toBe(expectedStatus);
  expect(result.body).toHaveProperty("error");
}

function assertSuccessResult(
  result: IntentHandlerResult
): asserts result is IntentHandlerSuccessResult {
  expect(result.status).toBe(200);
  expect(result.body).toHaveProperty("session_id");
  expect(result.body).toHaveProperty("response");
}

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

function buildMalformedAssistantResponse() {
  return {
    chat_reply: "Malformed response",
    canvas_state: {
      process_name: "Expense Approval",
      form_fields: [],
      sheet_headers: ["Timestamp"],
      flow_steps: []
    }
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

    assertErrorResult(result, 400);
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

    assertErrorResult(result, 401);
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

    assertErrorResult(result, 403);
    expect(result.body.error.code).toBe("FORBIDDEN");
    expect(result.body.error.request_id).toBe("req-forbidden");
    expect(result.body.error.details.reason).toBe("session_access_denied");
  });

  test("returns INTERNAL_ERROR with unexpected_error reason when authorization throws", async () => {
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockRejectedValue(new Error("auth service unavailable")),
      processIntent: vi.fn().mockResolvedValue(buildValidAssistantResponse()),
      requestIdFactory: () => "req-auth-throws"
    });

    const result = await handler({
      rawBody: buildValidIntentRequest(),
      auth: { user_id: "user-123" }
    });

    assertErrorResult(result, 500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
    expect(result.body.error.request_id).toBe("req-auth-throws");
    expect(result.body.error.details.reason).toBe("unexpected_error");
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

    assertErrorResult(result, 500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
    expect(result.body.error.request_id).toBe("req-process-throws");
    expect(result.body.error.details.reason).toBe("unexpected_error");
  });

  test("returns deterministic fallback when processIntent returns malformed payload and no repair dependency is provided", async () => {
    const request = buildValidIntentRequest();
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent: vi.fn().mockResolvedValue(buildMalformedAssistantResponse()),
      requestIdFactory: () => "req-invalid-assistant-response"
    });

    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    assertSuccessResult(result);
    expect(result.body.session_id).toBe("sess-123");
    expect(result.body.response.chat_reply).toBe(
      "I could not safely apply that update yet. Which field should I add, and should it be required?"
    );
    expect(result.body.response.canvas_state).toEqual(request.canvas_state);
    expect(result.body.response.canvas_state_patch).toEqual([]);
    expect(result.body.response.confidence).toBe(0.2);
    expect(result.body.response.unresolved_questions).toEqual([
      "Which field should I add, and should it be required?"
    ]);
    expect(result.body.response.next_actions).toEqual([
      "Answer clarifying question",
      "Retry intent update"
    ]);
  });

  test("returns repaired response when repairIntent fixes malformed processor output", async () => {
    const request = buildValidIntentRequest();
    const processIntent = vi.fn().mockResolvedValue(buildMalformedAssistantResponse());
    const repairIntent = vi.fn().mockResolvedValue(buildValidAssistantResponse());
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent,
      repairIntent
    });

    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    assertSuccessResult(result);
    expect(result.body.session_id).toBe("sess-123");
    expect(result.body.response.chat_reply).toBe("Added Requester Name.");
    expect(repairIntent).toHaveBeenCalledTimes(1);
    expect(repairIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        access: {
          user_id: "user-123",
          session_id: "sess-123"
        },
        invalid_response: buildMalformedAssistantResponse(),
        validation_issues: expect.any(Array)
      })
    );
    expect(processIntent).toHaveBeenCalledTimes(1);
  });

  test("returns deterministic fallback when repairIntent also returns malformed payload", async () => {
    const request = buildValidIntentRequest();
    const processIntent = vi.fn().mockResolvedValue(buildMalformedAssistantResponse());
    const repairIntent = vi.fn().mockResolvedValue({
      chat_reply: "still malformed"
    });
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent,
      repairIntent
    });

    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    assertSuccessResult(result);
    expect(result.body.response.chat_reply).toBe(
      "I could not safely apply that update yet. Which field should I add, and should it be required?"
    );
    expect(repairIntent).toHaveBeenCalledTimes(1);
  });

  test("returns deterministic fallback when repairIntent throws", async () => {
    const request = buildValidIntentRequest();
    const processIntent = vi.fn().mockResolvedValue(buildMalformedAssistantResponse());
    const repairIntent = vi.fn().mockRejectedValue(new Error("repair call failed"));
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent,
      repairIntent
    });

    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    assertSuccessResult(result);
    expect(result.body.response.chat_reply).toBe(
      "I could not safely apply that update yet. Which field should I add, and should it be required?"
    );
    expect(repairIntent).toHaveBeenCalledTimes(1);
  });

  test("returns success envelope for valid authorized request", async () => {
    const processIntent = vi.fn().mockResolvedValue(buildValidAssistantResponse());
    const repairIntent = vi.fn();
    const handler = createIntentHandler({
      authorizeSession: vi.fn().mockResolvedValue(true),
      processIntent,
      repairIntent
    });

    const request = buildValidIntentRequest();
    const result = await handler({
      rawBody: request,
      auth: { user_id: "user-123" }
    });

    assertSuccessResult(result);
    expect(result.body.session_id).toBe("sess-123");
    expect(result.body.response.chat_reply).toBe("Added Requester Name.");
    expect(processIntent).toHaveBeenCalledWith({
      request,
      access: {
        user_id: "user-123",
        session_id: "sess-123"
      }
    });
    expect(repairIntent).not.toHaveBeenCalled();
  });
});
