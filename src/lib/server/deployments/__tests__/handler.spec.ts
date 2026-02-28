import { describe, expect, test } from "vitest";

import {
  createDeploymentRetryHandler,
  createDeploymentStatusHandler,
  createDeploymentsHandler
} from "@/lib/server/deployments/handler";
import type { DeploymentsStore } from "@/lib/server/deployments/store";
import {
  createInMemoryDeploymentsStore
} from "@/lib/server/deployments/store";

function buildReadyPayload() {
  return {
    session_id: "sess-123",
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
          id: "start",
          label: "Start",
          type: "input"
        }
      ]
    },
    idempotency_key: "deploy-sess-123-v1",
    assistant_snapshot: {
      confidence: 0.91,
      unresolved_questions: [],
      deploy_ready: true,
      deploy_readiness_reasons: []
    }
  };
}

describe("deployments create handler", () => {
  test("returns INVALID_SCHEMA for invalid payload", () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-invalid"
    });

    const result = handler({
      rawBody: {
        session_id: "",
        idempotency_key: ""
      }
    });

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("INVALID_SCHEMA");
  });

  test("returns DEPLOY_NOT_READY when snapshot says deploy is blocked", () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-not-ready"
    });
    const payload = buildReadyPayload();
    payload.assistant_snapshot.deploy_ready = false;
    payload.assistant_snapshot.deploy_readiness_reasons = ["Critical unresolved questions remain."];

    const result = handler({
      rawBody: payload
    });

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("DEPLOY_NOT_READY");
    expect(result.body.error.details.deploy_readiness_reasons).toEqual([
      "Critical unresolved questions remain."
    ]);
  });

  test("returns 202 with deployment id for first valid request", () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-created"
    });

    const result = handler({
      rawBody: buildReadyPayload()
    });

    expect(result.status).toBe(202);
    if (result.status === 202) {
      expect(result.body.status).toBe("queued");
      expect(result.body.deployment_id).toBeTypeOf("string");
    }
  });

  test("returns same deployment id for idempotent replay", () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-replay"
    });
    const payload = buildReadyPayload();

    const first = handler({
      rawBody: payload
    });
    const replay = handler({
      rawBody: payload
    });

    expect(first.status).toBe(202);
    expect(replay.status).toBe(202);
    if (first.status === 202 && replay.status === 202) {
      expect(replay.body.deployment_id).toBe(first.body.deployment_id);
    }
  });

  test("returns CONFLICT when idempotency key is reused with different payload", () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-conflict"
    });
    const firstPayload = buildReadyPayload();
    const secondPayload = buildReadyPayload();
    secondPayload.assistant_snapshot.confidence = 0.77;

    handler({
      rawBody: firstPayload
    });
    const conflict = handler({
      rawBody: secondPayload
    });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("CONFLICT");
    expect(conflict.body.error.details.reason).toBe(
      "idempotency_key_reused_with_different_payload"
    );
  });
});

describe("deployments status and retry handlers", () => {
  test("returns NOT_FOUND when status is requested for unknown deployment", () => {
    const statusHandler = createDeploymentStatusHandler({
      store: createInMemoryDeploymentsStore(),
      requestIdFactory: () => "req-status-not-found"
    });

    const result = statusHandler({
      deployment_id: "missing-id"
    });

    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe("NOT_FOUND");
  });

  test("advances deployment status across polling requests", () => {
    const store = createInMemoryDeploymentsStore();
    const createHandler = createDeploymentsHandler({
      store,
      requestIdFactory: () => "req-create"
    });
    const statusHandler = createDeploymentStatusHandler({
      store,
      requestIdFactory: () => "req-status"
    });

    const created = createHandler({
      rawBody: buildReadyPayload()
    });
    if (created.status !== 202) {
      throw new Error("Expected deployment creation to succeed");
    }

    const firstPoll = statusHandler({
      deployment_id: created.body.deployment_id
    });
    expect(firstPoll.status).toBe(200);
    if (firstPoll.status === 200) {
      expect(firstPoll.body.status).toBe("running");
      expect(firstPoll.body.progress?.current_step).toBe("Auth");
    }

    let latest = firstPoll;
    for (let index = 0; index < 5; index += 1) {
      latest = statusHandler({
        deployment_id: created.body.deployment_id
      });
    }

    expect(latest.status).toBe(200);
    if (latest.status === 200) {
      expect(latest.body.status).toBe("succeeded");
      expect(latest.body.progress?.completed_steps).toEqual([
        "Auth",
        "Form",
        "Sheet",
        "Script",
        "Trigger"
      ]);
    }
  });

  test("returns CONFLICT when retry is called for a deployment that has not failed", () => {
    const store = createInMemoryDeploymentsStore();
    const createHandler = createDeploymentsHandler({
      store,
      requestIdFactory: () => "req-create"
    });
    const retryHandler = createDeploymentRetryHandler({
      store,
      requestIdFactory: () => "req-retry"
    });

    const created = createHandler({
      rawBody: buildReadyPayload()
    });
    if (created.status !== 202) {
      throw new Error("Expected deployment creation to succeed");
    }

    const retry = retryHandler({
      deployment_id: created.body.deployment_id
    });
    expect(retry.status).toBe(409);
    expect(retry.body.error.code).toBe("CONFLICT");
    expect(retry.body.error.details.reason).toBe("deployment_not_failed");
  });

  test("retries from a failed checkpoint deployment", () => {
    const store = createInMemoryDeploymentsStore();
    const createHandler = createDeploymentsHandler({
      store,
      requestIdFactory: () => "req-create"
    });
    const statusHandler = createDeploymentStatusHandler({
      store,
      requestIdFactory: () => "req-status"
    });
    const retryHandler = createDeploymentRetryHandler({
      store,
      requestIdFactory: () => "req-retry"
    });

    const payload = buildReadyPayload();
    payload.idempotency_key = "deploy-sess-123-fail-once-v1";
    const created = createHandler({
      rawBody: payload
    });
    if (created.status !== 202) {
      throw new Error("Expected deployment creation to succeed");
    }

    for (let index = 0; index < 5; index += 1) {
      statusHandler({
        deployment_id: created.body.deployment_id
      });
    }

    const failed = statusHandler({
      deployment_id: created.body.deployment_id
    });
    expect(failed.status).toBe(200);
    if (failed.status === 200) {
      expect(failed.body.status).toBe("failed");
      expect(failed.body.progress?.failed_step).toBe("Script");
    }

    const retried = retryHandler({
      deployment_id: created.body.deployment_id
    });
    expect(retried.status).toBe(202);
    if (retried.status === 202) {
      expect(retried.body.status).toBe("running");
    }
  });
});

describe("deployments handlers internal errors", () => {
  const throwingStore: DeploymentsStore = {
    createOrGetDeployment() {
      throw new Error("store unavailable");
    },
    getDeploymentById() {
      return null;
    },
    advanceDeployment() {
      throw new Error("status unavailable");
    },
    retryDeployment() {
      throw new Error("retry unavailable");
    }
  };

  test("returns INTERNAL_ERROR for create handler store failures", () => {
    const handler = createDeploymentsHandler({
      store: throwingStore,
      requestIdFactory: () => "req-throws"
    });

    const result = handler({
      rawBody: buildReadyPayload()
    });

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
    expect(result.body.error.details.reason).toBe("unexpected_error");
  });

  test("returns INTERNAL_ERROR for status handler store failures", () => {
    const handler = createDeploymentStatusHandler({
      store: throwingStore,
      requestIdFactory: () => "req-status-throws"
    });

    const result = handler({
      deployment_id: "dep-1"
    });

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
  });

  test("returns INTERNAL_ERROR for retry handler store failures", () => {
    const handler = createDeploymentRetryHandler({
      store: throwingStore,
      requestIdFactory: () => "req-retry-throws"
    });

    const result = handler({
      deployment_id: "dep-1"
    });

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_ERROR");
  });
});
