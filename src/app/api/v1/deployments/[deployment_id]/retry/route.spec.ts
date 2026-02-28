import { describe, expect, test } from "vitest";

import {
  DeploymentCreateAcceptedSchema,
  DeploymentRetryAcceptedSchema,
  DeploymentStatusSchema
} from "@/lib/contracts";

import { POST as createDeployment } from "../../route";
import { GET as getDeploymentStatus } from "../route";
import { POST } from "./route";

function buildCreateRequest(idempotency_key: string): Request {
  return new Request("http://localhost/api/v1/deployments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "sess-retry-route",
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
    })
  });
}

function buildRouteContext(deployment_id: string) {
  return {
    params: Promise.resolve({
      deployment_id
    })
  };
}

describe("POST /api/v1/deployments/{deployment_id}/retry", () => {
  test("returns 202 when retrying a failed deployment", async () => {
    const createResponse = await createDeployment(
      buildCreateRequest("route-fail-once-v1")
    );
    const created = DeploymentCreateAcceptedSchema.parse(await createResponse.json());

    for (let index = 0; index < 6; index += 1) {
      await getDeploymentStatus(
        new Request("http://localhost"),
        buildRouteContext(created.deployment_id)
      );
    }

    const failedResponse = await getDeploymentStatus(
      new Request("http://localhost"),
      buildRouteContext(created.deployment_id)
    );
    const failedPayload = DeploymentStatusSchema.parse(await failedResponse.json());
    expect(failedPayload.status).toBe("failed");
    expect(failedPayload.progress?.failed_step).toBe("Script");

    const retryResponse = await POST(
      new Request("http://localhost", { method: "POST" }),
      buildRouteContext(created.deployment_id)
    );

    expect(retryResponse.status).toBe(202);
    const retryPayload = DeploymentRetryAcceptedSchema.parse(await retryResponse.json());
    expect(retryPayload.deployment_id).toBe(created.deployment_id);
    expect(retryPayload.status).toBe("running");
  });

  test("returns CONFLICT when retry is called for a deployment that has not failed", async () => {
    const createResponse = await createDeployment(
      buildCreateRequest("route-retry-conflict-v1")
    );
    const created = DeploymentCreateAcceptedSchema.parse(await createResponse.json());

    const response = await POST(
      new Request("http://localhost", { method: "POST" }),
      buildRouteContext(created.deployment_id)
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.details.reason).toBe("deployment_not_failed");
  });
});
