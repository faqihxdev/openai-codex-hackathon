import { randomUUID } from "node:crypto";

import type { AssistantResponse } from "@/lib/contracts";
import { createApiErrorResponse, type ApiErrorResponseBody } from "@/lib/errors";

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
) => Promise<AssistantResponse> | AssistantResponse;

export interface IntentHandlerDependencies {
  authorizeSession: AuthorizeSession;
  processIntent: ProcessIntent;
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

      const successEnvelope = IntentSuccessEnvelopeSchema.safeParse({
        session_id: parsedRequest.data.session_id,
        response
      });

      if (!successEnvelope.success) {
        return buildError("INTERNAL_ERROR", request_id, {
          reason: "invalid_assistant_response",
          issues: successEnvelope.error.issues
        });
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
