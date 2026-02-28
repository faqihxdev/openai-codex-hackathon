import { randomUUID } from "node:crypto";

import { createApiErrorResponse, type ApiErrorResponseBody } from "@/lib/errors";

import { toCanonicalJson } from "./hash";
import {
  type DeploymentCreateAccepted,
  type DeploymentCreateRequest,
  DeploymentCreateAcceptedSchema,
  DeploymentCreateRequestSchema
} from "./schemas";
import {
  createInMemoryDeploymentsStore,
  createQueuedDeploymentStatus,
  type DeploymentsStore
} from "./store";

type RequestIdFactory = () => string;

export interface DeploymentsHandlerDependencies {
  store: DeploymentsStore;
  requestIdFactory?: RequestIdFactory;
}

export interface DeploymentsHandlerInput {
  rawBody: unknown;
}

export type DeploymentsHandlerSuccessResult = {
  status: 202;
  body: DeploymentCreateAccepted;
};

export type DeploymentsHandlerErrorResult = {
  status: number;
  body: ApiErrorResponseBody;
};

export type DeploymentsHandlerResult =
  | DeploymentsHandlerSuccessResult
  | DeploymentsHandlerErrorResult;

function buildError(
  code: "INVALID_SCHEMA" | "DEPLOY_NOT_READY" | "CONFLICT" | "INTERNAL_ERROR",
  request_id: string,
  details: Record<string, unknown>
): DeploymentsHandlerErrorResult {
  return createApiErrorResponse({
    code,
    request_id,
    details
  });
}

function buildRequestHash(request: DeploymentCreateRequest): string {
  return toCanonicalJson({
    session_id: request.session_id,
    canvas_state: request.canvas_state,
    assistant_snapshot: {
      deploy_ready: request.assistant_snapshot.deploy_ready,
      deploy_readiness_reasons: request.assistant_snapshot.deploy_readiness_reasons,
      confidence: request.assistant_snapshot.confidence,
      unresolved_questions: request.assistant_snapshot.unresolved_questions
    }
  });
}

export function createDeploymentsHandler(dependencies: DeploymentsHandlerDependencies) {
  const requestIdFactory = dependencies.requestIdFactory ?? randomUUID;

  return function handleDeployments(
    input: DeploymentsHandlerInput
  ): DeploymentsHandlerResult {
    const request_id = requestIdFactory();

    const parsedRequest = DeploymentCreateRequestSchema.safeParse(input.rawBody);
    if (!parsedRequest.success) {
      return buildError("INVALID_SCHEMA", request_id, {
        issues: parsedRequest.error.issues
      });
    }

    try {
      const request = parsedRequest.data;
      if (!request.assistant_snapshot.deploy_ready) {
        return buildError("DEPLOY_NOT_READY", request_id, {
          session_id: request.session_id,
          deploy_readiness_reasons: request.assistant_snapshot.deploy_readiness_reasons
        });
      }

      const request_hash = buildRequestHash(request);
      const initial_status = createQueuedDeploymentStatus();
      const result = dependencies.store.createOrGetDeployment({
        scope_key: request.session_id,
        idempotency_key: request.idempotency_key,
        request_hash,
        initial_status
      });

      if (result.kind === "conflict") {
        return buildError("CONFLICT", request_id, {
          session_id: request.session_id,
          idempotency_key: request.idempotency_key,
          reason: "idempotency_key_reused_with_different_payload"
        });
      }

      return {
        status: 202,
        body: DeploymentCreateAcceptedSchema.parse({
          deployment_id: result.deployment.deployment_id,
          status: result.deployment.status
        })
      };
    } catch (error) {
      return buildError("INTERNAL_ERROR", request_id, {
        reason: "unexpected_error",
        error_message: error instanceof Error ? error.message : "unknown_error"
      });
    }
  };
}

const defaultDeploymentsStore = createInMemoryDeploymentsStore();

export const handleDeployments = createDeploymentsHandler({
  store: defaultDeploymentsStore
});

