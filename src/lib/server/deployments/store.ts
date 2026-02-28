import { randomUUID } from "node:crypto";

import type { DeploymentStatus } from "@/lib/contracts";

type RecordKey = string;

export const DEPLOYMENT_PROGRESS_STEPS = Object.freeze([
  "Auth",
  "Form",
  "Sheet",
  "Script",
  "Trigger"
] as const);

export type DeploymentProgressStep =
  (typeof DEPLOYMENT_PROGRESS_STEPS)[number];

type IdempotencyRecord = {
  deployment_id: string;
  request_hash: string;
};

type DeploymentRuntime = {
  fail_once_step: DeploymentProgressStep | null;
  has_failed_once: boolean;
};

export type CreateOrGetDeploymentInput = {
  scope_key: string;
  idempotency_key: string;
  request_hash: string;
  initial_status: DeploymentStatus;
};

export type CreateOrGetDeploymentResult =
  | {
      kind: "created";
      deployment: DeploymentStatus;
    }
  | {
      kind: "replayed";
      deployment: DeploymentStatus;
    }
  | {
      kind: "conflict";
    };

export type RetryDeploymentResult =
  | {
      kind: "retried";
      deployment: DeploymentStatus;
    }
  | {
      kind: "not_found";
    }
  | {
      kind: "conflict";
      reason: "deployment_not_failed";
    };

export interface DeploymentsStore {
  createOrGetDeployment(input: CreateOrGetDeploymentInput): CreateOrGetDeploymentResult;
  getDeploymentById(deployment_id: string): DeploymentStatus | null;
  advanceDeployment(deployment_id: string): DeploymentStatus | null;
  retryDeployment(deployment_id: string): RetryDeploymentResult;
}

function makeIdempotencyRecordKey(scope_key: string, idempotency_key: string): RecordKey {
  return `${scope_key}:${idempotency_key}`;
}

function ensureProgress(status: DeploymentStatus): NonNullable<DeploymentStatus["progress"]> {
  return status.progress ?? {
    current_step: DEPLOYMENT_PROGRESS_STEPS[0],
    completed_steps: [],
    failed_step: null
  };
}

function markStepAsset(
  status: DeploymentStatus,
  completedStep: DeploymentProgressStep
): DeploymentStatus["assets"] {
  if (completedStep === "Form" && status.assets.form_id === null) {
    return {
      ...status.assets,
      form_id: `form-${status.deployment_id.slice(0, 8)}`
    };
  }
  if (completedStep === "Sheet" && status.assets.spreadsheet_id === null) {
    return {
      ...status.assets,
      spreadsheet_id: `sheet-${status.deployment_id.slice(0, 8)}`
    };
  }
  if (completedStep === "Script" && status.assets.script_id === null) {
    return {
      ...status.assets,
      script_id: `script-${status.deployment_id.slice(0, 8)}`
    };
  }

  return status.assets;
}

function transitionRunningDeployment(
  current: DeploymentStatus,
  runtime: DeploymentRuntime | undefined
): DeploymentStatus {
  const progress = ensureProgress(current);
  const currentStepIndex = DEPLOYMENT_PROGRESS_STEPS.findIndex(
    (step) => step === progress.current_step
  );

  if (currentStepIndex < 0) {
    return {
      ...current,
      status: "failed",
      error: {
        code: "INTERNAL_ERROR",
        message: "Unknown deployment step.",
        details: {
          current_step: progress.current_step
        }
      },
      progress: {
        ...progress,
        failed_step: progress.current_step
      }
    };
  }

  const currentStep = DEPLOYMENT_PROGRESS_STEPS[currentStepIndex];
  if (
    runtime &&
    runtime.fail_once_step === currentStep &&
    !runtime.has_failed_once
  ) {
    runtime.has_failed_once = true;

    return {
      ...current,
      status: "failed",
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: `${currentStep} step failed. Retry to continue from the last checkpoint.`,
        details: {
          failed_step: currentStep
        }
      },
      progress: {
        ...progress,
        failed_step: currentStep
      }
    };
  }

  const completed_steps = progress.completed_steps.includes(currentStep)
    ? progress.completed_steps
    : [...progress.completed_steps, currentStep];
  const hasNextStep = currentStepIndex < DEPLOYMENT_PROGRESS_STEPS.length - 1;
  const nextStep = hasNextStep
    ? DEPLOYMENT_PROGRESS_STEPS[currentStepIndex + 1]
    : currentStep;

  return {
    ...current,
    status: hasNextStep ? "running" : "succeeded",
    assets: markStepAsset(current, currentStep),
    error: null,
    progress: {
      current_step: nextStep,
      completed_steps,
      failed_step: null
    }
  };
}

export function createQueuedDeploymentStatus(
  deployment_id: string = randomUUID()
): DeploymentStatus {
  return {
    deployment_id,
    status: "queued",
    assets: {
      form_id: null,
      spreadsheet_id: null,
      script_id: null
    },
    error: null,
    progress: {
      current_step: DEPLOYMENT_PROGRESS_STEPS[0],
      completed_steps: [],
      failed_step: null
    }
  };
}

export function createInMemoryDeploymentsStore(): DeploymentsStore {
  const deploymentsById = new Map<string, DeploymentStatus>();
  const idempotencyByScopedKey = new Map<RecordKey, IdempotencyRecord>();
  const runtimeByDeploymentId = new Map<string, DeploymentRuntime>();

  return {
    createOrGetDeployment(input: CreateOrGetDeploymentInput): CreateOrGetDeploymentResult {
      const scopedRecordKey = makeIdempotencyRecordKey(
        input.scope_key,
        input.idempotency_key
      );
      const existing = idempotencyByScopedKey.get(scopedRecordKey);

      if (!existing) {
        deploymentsById.set(input.initial_status.deployment_id, input.initial_status);
        runtimeByDeploymentId.set(input.initial_status.deployment_id, {
          fail_once_step: input.idempotency_key.includes("fail-once") ? "Script" : null,
          has_failed_once: false
        });
        idempotencyByScopedKey.set(scopedRecordKey, {
          deployment_id: input.initial_status.deployment_id,
          request_hash: input.request_hash
        });

        return {
          kind: "created",
          deployment: input.initial_status
        };
      }

      if (existing.request_hash !== input.request_hash) {
        return {
          kind: "conflict"
        };
      }

      const deployment = deploymentsById.get(existing.deployment_id);
      if (!deployment) {
        return {
          kind: "conflict"
        };
      }

      return {
        kind: "replayed",
        deployment
      };
    },

    getDeploymentById(deployment_id: string): DeploymentStatus | null {
      return deploymentsById.get(deployment_id) ?? null;
    },

    advanceDeployment(deployment_id: string): DeploymentStatus | null {
      const current = deploymentsById.get(deployment_id);
      if (!current) {
        return null;
      }

      const normalizedCurrent = {
        ...current,
        progress: ensureProgress(current)
      };
      let next = normalizedCurrent;

      if (normalizedCurrent.status === "queued") {
        next = {
          ...normalizedCurrent,
          status: "running",
          error: null
        };
      } else if (normalizedCurrent.status === "running") {
        next = transitionRunningDeployment(
          normalizedCurrent,
          runtimeByDeploymentId.get(deployment_id)
        );
      }

      deploymentsById.set(deployment_id, next);

      return next;
    },

    retryDeployment(deployment_id: string): RetryDeploymentResult {
      const existing = deploymentsById.get(deployment_id);
      if (!existing) {
        return {
          kind: "not_found"
        };
      }

      const progress = ensureProgress(existing);
      if (existing.status !== "failed" || progress.failed_step === null) {
        return {
          kind: "conflict",
          reason: "deployment_not_failed"
        };
      }

      const next: DeploymentStatus = {
        ...existing,
        status: "running",
        error: null,
        progress: {
          ...progress,
          current_step: progress.failed_step,
          failed_step: null
        }
      };
      deploymentsById.set(deployment_id, next);

      return {
        kind: "retried",
        deployment: next
      };
    }
  };
}
