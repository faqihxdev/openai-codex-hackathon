import { describe, expect, test } from "vitest";

import {
  createDeploymentsHandler
} from "@/lib/server/deployments/handler";
import type { GoogleWorkspaceDeployer } from "@/lib/server/deployments/google-workspace";
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

function buildSuccessDeployer(): GoogleWorkspaceDeployer {
  return {
    async deploy() {
      return {
        form_id: "form-123",
        spreadsheet_id: "sheet-123",
        script_id: "script-123"
      };
    }
  };
}

function waitForBackgroundWork(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("deployments handler", () => {
  test("returns INVALID_SCHEMA for invalid payload", async () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-invalid"
    });

    const result = await handler({
      rawBody: {
        session_id: "",
        idempotency_key: ""
      }
    });

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("INVALID_SCHEMA");
  });

  test("returns DEPLOY_NOT_READY when snapshot says deploy is blocked", async () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-not-ready"
    });
    const payload = buildReadyPayload();
    payload.assistant_snapshot.deploy_ready = false;
    payload.assistant_snapshot.deploy_readiness_reasons = ["Critical unresolved questions remain."];

    const result = await handler({
      rawBody: payload
    });

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("DEPLOY_NOT_READY");
    expect(result.body.error.details.deploy_readiness_reasons).toEqual([
      "Critical unresolved questions remain."
    ]);
  });

  test("returns 202 with deployment id for first valid request", async () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-created"
    });

    const result = await handler({
      rawBody: buildReadyPayload()
    });

    expect(result.status).toBe(202);
    if (result.status === 202) {
      expect(result.body.status).toBe("queued");
      expect(result.body.deployment_id).toBeTypeOf("string");
    }
  });

  test("returns same deployment id for idempotent replay", async () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-replay"
    });
    const payload = buildReadyPayload();

    const first = await handler({
      rawBody: payload
    });
    const replay = await handler({
      rawBody: payload
    });

    expect(first.status).toBe(202);
    expect(replay.status).toBe(202);
    if (first.status === 202 && replay.status === 202) {
      expect(replay.body.deployment_id).toBe(first.body.deployment_id);
    }
  });

  test("returns CONFLICT when idempotency key is reused with different payload", async () => {
    const handler = createDeploymentsHandler({
      store: createInMemoryDeploymentsStore(),
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-conflict"
    });
    const firstPayload = buildReadyPayload();
    const secondPayload = buildReadyPayload();
    secondPayload.assistant_snapshot.confidence = 0.77;

    await handler({
      rawBody: firstPayload
    });
    const conflict = await handler({
      rawBody: secondPayload
    });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("CONFLICT");
    expect(conflict.body.error.details.reason).toBe(
      "idempotency_key_reused_with_different_payload"
    );
  });

  test("marks deployment succeeded and persists created asset IDs", async () => {
    const store = createInMemoryDeploymentsStore();
    const handler = createDeploymentsHandler({
      store,
      deployer: buildSuccessDeployer(),
      requestIdFactory: () => "req-success"
    });

    const result = await handler({
      rawBody: buildReadyPayload()
    });

    expect(result.status).toBe(202);
    if (result.status !== 202) {
      throw new Error("expected accepted response");
    }

    await waitForBackgroundWork();

    const persisted = store.getDeploymentById(result.body.deployment_id);
    expect(persisted?.status).toBe("succeeded");
    expect(persisted?.assets).toEqual({
      form_id: "form-123",
      spreadsheet_id: "sheet-123",
      script_id: "script-123"
    });
  });

  test("marks deployment failed when google workflow fails", async () => {
    const store = createInMemoryDeploymentsStore();
    const failingDeployer: GoogleWorkspaceDeployer = {
      async deploy() {
        throw new Error("google api unavailable");
      }
    };

    const handler = createDeploymentsHandler({
      store,
      deployer: failingDeployer,
      requestIdFactory: () => "req-failed"
    });

    const result = await handler({
      rawBody: buildReadyPayload()
    });

    expect(result.status).toBe(202);
    if (result.status !== 202) {
      throw new Error("expected accepted response");
    }

    await waitForBackgroundWork();

    const persisted = store.getDeploymentById(result.body.deployment_id);
    expect(persisted?.status).toBe("failed");
    expect(persisted?.error?.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(persisted?.error?.details?.reason).toBe("google_deploy_failed");
  });
});
