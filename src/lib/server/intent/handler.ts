import { randomUUID } from "node:crypto";

import type { AssistantResponse } from "@/lib/contracts";
import { createApiErrorResponse, type ApiErrorResponseBody } from "@/lib/errors";
import type { ZodIssue } from "zod";

import { type AuthorizeSession, guardIntentAccess, type IntentAuthContext } from "./auth";
import {
  type IntentRequest,
  IntentRequestSchema,
  type IntentSuccessEnvelope,
  IntentSuccessEnvelopeSchema
} from "./schemas";

type RequestIdFactory = () => string;

type ProcessIntentInput = {
  request: IntentRequest;
  access: {
    user_id: string;
    session_id: string;
  };
};

export type ProcessIntent = (
  input: ProcessIntentInput
) => Promise<unknown> | unknown;

type RepairIntentInput = ProcessIntentInput & {
  invalid_response: unknown;
  validation_issues: ZodIssue[];
};

export type RepairIntent = (
  input: RepairIntentInput
) => Promise<unknown> | unknown;

export interface IntentHandlerDependencies {
  authorizeSession: AuthorizeSession;
  processIntent: ProcessIntent;
  repairIntent?: RepairIntent;
  requestIdFactory?: RequestIdFactory;
}

export interface IntentHandlerInput {
  rawBody: unknown;
  auth: IntentAuthContext;
}

export type IntentHandlerSuccessResult = {
  status: 200;
  body: IntentSuccessEnvelope;
};

export type IntentHandlerErrorResult = {
  status: number;
  body: ApiErrorResponseBody;
};

export type IntentHandlerResult = IntentHandlerSuccessResult | IntentHandlerErrorResult;

function buildError(
  code: "INVALID_SCHEMA" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR",
  request_id: string,
  details: Record<string, unknown>
): IntentHandlerErrorResult {
  return createApiErrorResponse({
    code,
    request_id,
    details
  });
}

function parseSuccessEnvelope(
  session_id: string,
  response: unknown
) {
  return IntentSuccessEnvelopeSchema.safeParse({
    session_id,
    response
  });
}

function getFallbackQuestion(
  intent_type: IntentRequest["intent_event"]["intent_type"]
): string {
  switch (intent_type) {
    case "add_field":
      return "Which field should I add, and should it be required?";
    case "update_field":
      return "What exact field or step should I update?";
    case "add_step":
      return "What step should I add, and where should it appear?";
    case "remove_step":
      return "Which step should I remove from the workflow?";
    case "answer_question":
      return "Could you restate your answer with the exact value I should apply?";
    case "set_constraint":
      return "What constraint should I apply (for example approval threshold or approver)?";
    default:
      return "Could you clarify the exact change I should make?";
  }
}

function buildDeterministicFallbackResponse(
  request: IntentRequest
): AssistantResponse {
  const question = getFallbackQuestion(request.intent_event.intent_type);

  return {
    chat_reply: `I could not safely apply that update yet. ${question}`,
    canvas_state: request.canvas_state,
    canvas_state_patch: [],
    confidence: 0.2,
    unresolved_questions: [question],
    next_actions: ["Answer clarifying question", "Retry intent update"],
    deploy_ready: false,
    deploy_readiness_reasons: [
      "Critical unresolved questions remain.",
      "Fallback response requires additional clarification before deployment."
    ]
  };
}

async function attemptRepair(
  dependencies: IntentHandlerDependencies,
  request: IntentRequest,
  access: {
    user_id: string;
    session_id: string;
  },
  invalid_response: unknown,
  validation_issues: ZodIssue[]
): Promise<IntentSuccessEnvelope | null> {
  if (!dependencies.repairIntent) {
    return null;
  }

  try {
    const repairedResponse = await dependencies.repairIntent({
      request,
      access,
      invalid_response,
      validation_issues
    });

    const repairedEnvelope = parseSuccessEnvelope(
      request.session_id,
      repairedResponse
    );
    if (!repairedEnvelope.success) {
      return null;
    }

    return repairedEnvelope.data;
  } catch {
    return null;
  }
}

export function createIntentHandler(dependencies: IntentHandlerDependencies) {
  const requestIdFactory = dependencies.requestIdFactory ?? randomUUID;

  return async function handleIntent(input: IntentHandlerInput): Promise<IntentHandlerResult> {
    const request_id = requestIdFactory();

    const parsedRequest = IntentRequestSchema.safeParse(input.rawBody);
    if (!parsedRequest.success) {
      return buildError("INVALID_SCHEMA", request_id, {
        issues: parsedRequest.error.issues
      });
    }

    try {
      const authResult = await guardIntentAccess({
        context: input.auth,
        session_id: parsedRequest.data.session_id,
        authorizeSession: dependencies.authorizeSession
      });

      if (!authResult.ok) {
        return buildError(authResult.code, request_id, authResult.details);
      }

      const response = await dependencies.processIntent({
        request: parsedRequest.data,
        access: {
          user_id: authResult.user_id,
          session_id: authResult.session_id
        }
      });

      const successEnvelope = parseSuccessEnvelope(
        parsedRequest.data.session_id,
        response
      );

      if (!successEnvelope.success) {
        const repairedEnvelope = await attemptRepair(
          dependencies,
          parsedRequest.data,
          {
            user_id: authResult.user_id,
            session_id: authResult.session_id
          },
          response,
          successEnvelope.error.issues
        );

        if (repairedEnvelope) {
          return {
            status: 200,
            body: repairedEnvelope
          };
        }

        return {
          status: 200,
          body: IntentSuccessEnvelopeSchema.parse({
            session_id: parsedRequest.data.session_id,
            response: buildDeterministicFallbackResponse(parsedRequest.data)
          })
        };
      }

      return {
        status: 200,
        body: successEnvelope.data
      };
    } catch (error) {
      return buildError("INTERNAL_ERROR", request_id, {
        reason: "unexpected_error",
        error_message: error instanceof Error ? error.message : "unknown_error"
      });
    }
  };
}
