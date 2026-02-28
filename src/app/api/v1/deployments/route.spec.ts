import { describe, expect, test } from "vitest";

import { DeploymentCreateAcceptedSchema } from "@/lib/contracts";

import { POST } from "./route";

function buildRequest(payload: unknown): Request {
  return new Request("http://localhost/api/v1/deployments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function buildReadyPayload(idempotency_key: string) {
  return {
    session_id: "sess-route-1",
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
    idempotency_key,
    assistant_snapshot: {
      confidence: 0.9,
      unresolved_questions: [],
      deploy_ready: true,
      deploy_readiness_reasons: []
    }
  };
}

describe("POST /api/v1/deployments", () => {
  test("returns 202 and schema-valid accepted payload", async () => {
    const response = await POST(buildRequest(buildReadyPayload("route-happy-v1")));

    expect(response.status).toBe(202);
    const parsed = DeploymentCreateAcceptedSchema.parse(await response.json());
    expect(parsed.status).toBe("queued");
  });

  test("returns same deployment id for idempotent replay", async () => {
    const payload = buildReadyPayload("route-replay-v1");
    const first = await POST(buildRequest(payload));
    const second = await POST(buildRequest(payload));

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);

    const firstBody = DeploymentCreateAcceptedSchema.parse(await first.json());
    const secondBody = DeploymentCreateAcceptedSchema.parse(await second.json());
    expect(secondBody.deployment_id).toBe(firstBody.deployment_id);
  });

  test("returns DEPLOY_NOT_READY for blocked readiness snapshot", async () => {
    const payload = buildReadyPayload("route-not-ready-v1");
    payload.assistant_snapshot.deploy_ready = false;
    payload.assistant_snapshot.deploy_readiness_reasons = ["Critical unresolved questions remain."];

    const response = await POST(buildRequest(payload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DEPLOY_NOT_READY");
  });

  test("returns CONFLICT for idempotency key reuse with different payload", async () => {
    const firstPayload = buildReadyPayload("route-conflict-v1");
    const secondPayload = buildReadyPayload("route-conflict-v1");
    secondPayload.assistant_snapshot.confidence = 0.78;

    await POST(buildRequest(firstPayload));
    const response = await POST(buildRequest(secondPayload));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });
});

