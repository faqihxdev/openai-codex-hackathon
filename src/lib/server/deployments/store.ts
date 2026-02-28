import { randomUUID } from "node:crypto";

import type { DeploymentStatus } from "@/lib/contracts";

type RecordKey = string;

type IdempotencyRecord = {
  deployment_id: string;
  request_hash: string;
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

export interface DeploymentsStore {
  createOrGetDeployment(input: CreateOrGetDeploymentInput): CreateOrGetDeploymentResult;
  getDeploymentById(deployment_id: string): DeploymentStatus | null;
}

function makeIdempotencyRecordKey(scope_key: string, idempotency_key: string): RecordKey {
  return `${scope_key}:${idempotency_key}`;
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
    error: null
  };
}

export function createInMemoryDeploymentsStore(): DeploymentsStore {
  const deploymentsById = new Map<string, DeploymentStatus>();
  const idempotencyByScopedKey = new Map<RecordKey, IdempotencyRecord>();

  return {
    createOrGetDeployment(input: CreateOrGetDeploymentInput): CreateOrGetDeploymentResult {
      const scopedRecordKey = makeIdempotencyRecordKey(
        input.scope_key,
        input.idempotency_key
      );
      const existing = idempotencyByScopedKey.get(scopedRecordKey);

      if (!existing) {
        deploymentsById.set(input.initial_status.deployment_id, input.initial_status);
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
    }
  };
}

