import { describe, expect, test } from "vitest";

import {
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

describe("deployments handler", () => {
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

  test("returns INTERNAL_ERROR on unexpected store failure", () => {
    const throwingStore: DeploymentsStore = {
      createOrGetDeployment() {
        throw new Error("store unavailable");
      },
      getDeploymentById() {
        return null;
      }
    };
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
});

