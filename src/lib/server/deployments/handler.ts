import { randomUUID } from "node:crypto";

import type { DeploymentStatus } from "@/lib/contracts";
import { createApiErrorResponse, type ApiErrorResponseBody } from "@/lib/errors";

import {
  DeployWorkflowError,
  createGoogleWorkspaceDeployer,
  createMockGoogleWorkspaceDeployer,
  type GoogleWorkspaceDeployer
} from "./google-workspace";
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
  deployer: GoogleWorkspaceDeployer;
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

async function runDeploymentWorkflow(input: {
  store: DeploymentsStore;
  deployer: GoogleWorkspaceDeployer;
  deployment: DeploymentStatus;
  canvas_state: DeploymentCreateRequest["canvas_state"];
}) {
  const runningStatus: DeploymentStatus = {
    ...input.deployment,
    status: "running",
    progress: {
      current_step: "create_form",
      completed_steps: [],
      failed_step: null
    },
    error: null
  };
  input.store.saveDeployment(runningStatus);

  try {
    const assets = await input.deployer.deploy({
      deployment_id: input.deployment.deployment_id,
      canvas_state: input.canvas_state
    });

    input.store.saveDeployment({
      ...runningStatus,
      status: "succeeded",
      assets,
      progress: {
        current_step: "completed",
        completed_steps: [
          "create_form",
          "create_sheet",
          "create_script",
          "create_trigger"
        ],
        failed_step: null
      }
    });
  } catch (error) {
    const failedStep =
      error instanceof DeployWorkflowError
        ? error.failed_step
        : "unknown";
    const completedSteps =
      error instanceof DeployWorkflowError
        ? error.completed_steps
        : [];

    input.store.saveDeployment({
      ...runningStatus,
      status: "failed",
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "Google Workspace deployment workflow failed.",
        details: {
          reason: "google_deploy_failed",
          error_message: error instanceof Error ? error.message : "unknown_error"
        }
      },
      progress: {
        current_step: failedStep,
        completed_steps: completedSteps,
        failed_step: failedStep
      }
    });
  }
}

export function createDeploymentsHandler(dependencies: DeploymentsHandlerDependencies) {
  const requestIdFactory = dependencies.requestIdFactory ?? randomUUID;

  return async function handleDeployments(
    input: DeploymentsHandlerInput
  ): Promise<DeploymentsHandlerResult> {
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

      if (result.kind === "created") {
        void runDeploymentWorkflow({
          store: dependencies.store,
          deployer: dependencies.deployer,
          deployment: result.deployment,
          canvas_state: request.canvas_state
        });
      }

      return {
        status: 202,
        body: DeploymentCreateAcceptedSchema.parse({
          deployment_id: result.deployment.deployment_id,
          status: "queued"
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
const defaultGoogleAccessToken = process.env.GOOGLE_WORKSPACE_ACCESS_TOKEN?.trim();
const defaultDeployer = defaultGoogleAccessToken
  ? createGoogleWorkspaceDeployer({
      accessToken: defaultGoogleAccessToken
    })
  : createMockGoogleWorkspaceDeployer();

export const handleDeployments = createDeploymentsHandler({
  store: defaultDeploymentsStore,
  deployer: defaultDeployer
});
