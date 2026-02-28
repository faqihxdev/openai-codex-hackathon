import { describe, expect, test } from "vitest";

import { DeploymentCreateAcceptedSchema, DeploymentStatusSchema } from "@/lib/contracts";

import { POST as createDeployment } from "../route";
import { GET } from "./route";

function buildCreateRequest(idempotency_key: string): Request {
  return new Request("http://localhost/api/v1/deployments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      session_id: "sess-status-route",
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

describe("GET /api/v1/deployments/{deployment_id}", () => {
  test("returns status payload for an existing deployment", async () => {
    const createResponse = await createDeployment(
      buildCreateRequest("route-status-existing-v1")
    );
    const created = DeploymentCreateAcceptedSchema.parse(await createResponse.json());

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        deployment_id: created.deployment_id
      })
    });

    expect(response.status).toBe(200);
    const payload = DeploymentStatusSchema.parse(await response.json());
    expect(payload.deployment_id).toBe(created.deployment_id);
    expect(payload.status).toBe("running");
  });

  test("returns NOT_FOUND for unknown deployment id", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        deployment_id: "dep-missing-status"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
