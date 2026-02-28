import { randomUUID } from "node:crypto";

import { DeploymentStatusSchema, type DeploymentStatus } from "@/lib/contracts";
import { createApiErrorResponse, type ApiErrorResponseBody } from "@/lib/errors";

import { guardDeploymentAuth, type DeploymentAuthContext } from "./auth";
import { toCanonicalJson } from "./hash";
import {
  type DeploymentCreateAccepted,
  type DeploymentCreateRequest,
  type DeploymentRetryAccepted,
  DeploymentCreateAcceptedSchema,
  DeploymentCreateRequestSchema,
  DeploymentRetryAcceptedSchema
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
  auth: DeploymentAuthContext;
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

export interface DeploymentStatusHandlerInput {
  deployment_id: string;
  auth: DeploymentAuthContext;
}

export type DeploymentStatusHandlerSuccessResult = {
  status: 200;
  body: DeploymentStatus;
};

export type DeploymentStatusHandlerResult =
  | DeploymentStatusHandlerSuccessResult
  | DeploymentsHandlerErrorResult;

export interface DeploymentRetryHandlerInput {
  deployment_id: string;
  auth: DeploymentAuthContext;
}

export type DeploymentRetryHandlerSuccessResult = {
  status: 202;
  body: DeploymentRetryAccepted;
};

export type DeploymentRetryHandlerResult =
  | DeploymentRetryHandlerSuccessResult
  | DeploymentsHandlerErrorResult;

function buildError(
  code:
    | "UNAUTHORIZED"
    | "INVALID_SCHEMA"
    | "DEPLOY_NOT_READY"
    | "CONFLICT"
    | "NOT_FOUND"
    | "INTERNAL_ERROR",
  request_id: string,
  details: Record<string, unknown>,
  retryable?: boolean
): DeploymentsHandlerErrorResult {
  return createApiErrorResponse({
    code,
    request_id,
    details,
    retryable
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
      const authResult = guardDeploymentAuth({
        context: input.auth,
        resume_context: {
          session_id: request.session_id,
          idempotency_key: request.idempotency_key
        }
      });
      if (!authResult.ok) {
        return buildError(
          authResult.code,
          request_id,
          authResult.details,
          authResult.retryable
        );
      }

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

export function createDeploymentStatusHandler(
  dependencies: DeploymentsHandlerDependencies
) {
  const requestIdFactory = dependencies.requestIdFactory ?? randomUUID;

  return function handleDeploymentStatus(
    input: DeploymentStatusHandlerInput
  ): DeploymentStatusHandlerResult {
    const request_id = requestIdFactory();

    if (!input.deployment_id) {
      return buildError("INVALID_SCHEMA", request_id, {
        deployment_id: input.deployment_id,
        reason: "deployment_id_required"
      });
    }

    try {
      const authResult = guardDeploymentAuth({
        context: input.auth,
        resume_context: {
          deployment_id: input.deployment_id
        }
      });
      if (!authResult.ok) {
        return buildError(
          authResult.code,
          request_id,
          authResult.details,
          authResult.retryable
        );
      }

      const deployment = dependencies.store.advanceDeployment(input.deployment_id);
      if (!deployment) {
        return buildError("NOT_FOUND", request_id, {
          deployment_id: input.deployment_id
        });
      }

      return {
        status: 200,
        body: DeploymentStatusSchema.parse(deployment)
      };
    } catch (error) {
      return buildError("INTERNAL_ERROR", request_id, {
        deployment_id: input.deployment_id,
        reason: "unexpected_error",
        error_message: error instanceof Error ? error.message : "unknown_error"
      });
    }
  };
}

export function createDeploymentRetryHandler(
  dependencies: DeploymentsHandlerDependencies
) {
  const requestIdFactory = dependencies.requestIdFactory ?? randomUUID;

  return function handleDeploymentRetry(
    input: DeploymentRetryHandlerInput
  ): DeploymentRetryHandlerResult {
    const request_id = requestIdFactory();

    if (!input.deployment_id) {
      return buildError("INVALID_SCHEMA", request_id, {
        deployment_id: input.deployment_id,
        reason: "deployment_id_required"
      });
    }

    try {
      const authResult = guardDeploymentAuth({
        context: input.auth,
        resume_context: {
          deployment_id: input.deployment_id
        }
      });
      if (!authResult.ok) {
        return buildError(
          authResult.code,
          request_id,
          authResult.details,
          authResult.retryable
        );
      }

      const result = dependencies.store.retryDeployment(input.deployment_id);

      if (result.kind === "not_found") {
        return buildError("NOT_FOUND", request_id, {
          deployment_id: input.deployment_id
        });
      }

      if (result.kind === "conflict") {
        return buildError("CONFLICT", request_id, {
          deployment_id: input.deployment_id,
          reason: result.reason
        });
      }

      return {
        status: 202,
        body: DeploymentRetryAcceptedSchema.parse({
          deployment_id: result.deployment.deployment_id,
          status: result.deployment.status
        })
      };
    } catch (error) {
      return buildError("INTERNAL_ERROR", request_id, {
        deployment_id: input.deployment_id,
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
export const handleDeploymentStatus = createDeploymentStatusHandler({
  store: defaultDeploymentsStore
});
export const handleDeploymentRetry = createDeploymentRetryHandler({
  store: defaultDeploymentsStore
});
