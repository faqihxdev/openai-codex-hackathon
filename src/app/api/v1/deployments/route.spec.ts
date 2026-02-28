import { describe, expect, test } from "vitest";

import { DeploymentCreateAcceptedSchema } from "@/lib/contracts";
import { REQUIRED_DEPLOYMENT_OAUTH_SCOPES } from "@/lib/server/deployments";

import { POST } from "./route";

function buildAuthHeaders(
  overrides?: Partial<{
    user_id: string;
    oauth_token_status: "valid" | "missing" | "expired";
    oauth_scopes: string[];
  }>
): Record<string, string> {
  return {
    "x-user-id": overrides?.user_id ?? "user-route-1",
    "x-oauth-token-status": overrides?.oauth_token_status ?? "valid",
    "x-oauth-scopes": (overrides?.oauth_scopes ?? [
      ...REQUIRED_DEPLOYMENT_OAUTH_SCOPES
    ]).join(" ")
  };
}

function buildRequest(
  payload: unknown,
  authOverrides?: Parameters<typeof buildAuthHeaders>[0]
): Request {
  return new Request("http://localhost/api/v1/deployments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(authOverrides)
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

  test("returns recoverable UNAUTHORIZED and supports resume after re-auth", async () => {
    const payload = buildReadyPayload("route-reauth-resume-v1");

    const blocked = await POST(
      buildRequest(payload, {
        oauth_token_status: "expired"
      })
    );
    const blockedBody = await blocked.json();
    expect(blocked.status).toBe(401);
    expect(blockedBody.error.code).toBe("UNAUTHORIZED");
    expect(blockedBody.error.retryable).toBe(true);
    expect(blockedBody.error.details.reason).toBe("expired_oauth_token");
    expect(blockedBody.error.details.resume_context).toEqual({
      session_id: payload.session_id,
      idempotency_key: payload.idempotency_key
    });

    const resumed = await POST(buildRequest(payload));
    expect(resumed.status).toBe(202);
  });
});
