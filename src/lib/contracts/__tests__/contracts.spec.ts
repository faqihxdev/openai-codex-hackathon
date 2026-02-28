import { describe, expect, test } from "vitest";

import {
  AssistantResponseSchema,
  CanvasStateSchema,
  CanvasStatePatchSchema,
  DeploymentCreateAcceptedSchema,
  DeploymentCreateRequestSchema,
  DeploymentStatusSchema,
  HealthResponseSchema,
  IntentEventSchema
} from "@/lib/contracts";
import * as clientContracts from "@/lib/client/contracts";
import { clientContractsSmoke } from "@/lib/client/contracts.smoke";
import * as serverContracts from "@/lib/server/contracts";
import { serverContractsSmoke } from "@/lib/server/contracts.smoke";

describe("shared contract schemas", () => {
  test("CanvasStateSchema accepts canonical payload", () => {
    const parsed = CanvasStateSchema.parse({
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
          id: "node-1",
          label: "Submit Request",
          type: "input"
        }
      ]
    });

    expect(parsed.process_name).toBe("Expense Approval");
  });

  test("CanvasStateSchema rejects invalid form field type", () => {
    const parsed = CanvasStateSchema.safeParse({
      process_name: "Expense Approval",
      form_fields: [
        {
          type: "BOOLEAN",
          label: "Invalid Type",
          required: false
        }
      ],
      sheet_headers: ["Timestamp", "Invalid Type", "Edit Link"],
      flow_steps: []
    });

    expect(parsed.success).toBe(false);
  });

  test("IntentEventSchema rejects invalid source", () => {
    const parsed = IntentEventSchema.safeParse({
      id: "evt-123",
      source: "slack",
      intent_type: "add_field",
      payload: {},
      timestamp_iso: "2026-02-28T12:00:00Z"
    });

    expect(parsed.success).toBe(false);
  });

  test("IntentEventSchema rejects malformed ISO timestamp", () => {
    const parsed = IntentEventSchema.safeParse({
      id: "evt-123",
      source: "chat",
      intent_type: "add_field",
      payload: {},
      timestamp_iso: "02-28-2026 12:00:00"
    });

    expect(parsed.success).toBe(false);
  });

  test("AssistantResponseSchema rejects out-of-range confidence", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Added field",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: [],
        flow_steps: []
      },
      canvas_state_patch: [],
      confidence: 1.2,
      unresolved_questions: [],
      next_actions: [],
      deploy_ready: true,
      deploy_readiness_reasons: []
    });

    expect(parsed.success).toBe(false);
  });

  test("AssistantResponseSchema accepts canonical payload with deploy readiness fields", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Ready to deploy.",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: ["Timestamp", "Edit Link"],
        flow_steps: []
      },
      canvas_state_patch: [],
      confidence: 0.9,
      unresolved_questions: [],
      next_actions: ["Deploy"],
      deploy_ready: true,
      deploy_readiness_reasons: []
    });

    expect(parsed.success).toBe(true);
  });

  test("AssistantResponseSchema rejects invalid patch operation", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Patched",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: [],
        flow_steps: []
      },
      canvas_state_patch: [
        {
          op: "move",
          path: "/process_name",
          value: "New Name"
        }
      ],
      confidence: 0.9,
      unresolved_questions: [],
      next_actions: [],
      deploy_ready: true,
      deploy_readiness_reasons: []
    });

    expect(parsed.success).toBe(false);
  });

  test("CanvasStatePatchSchema rejects add patch without value", () => {
    const parsed = CanvasStatePatchSchema.safeParse({
      op: "add",
      path: "/process_name"
    });

    expect(parsed.success).toBe(false);
  });

  test("CanvasStatePatchSchema rejects replace patch without value", () => {
    const parsed = CanvasStatePatchSchema.safeParse({
      op: "replace",
      path: "/process_name"
    });

    expect(parsed.success).toBe(false);
  });

  test("CanvasStatePatchSchema accepts remove patch without value", () => {
    const parsed = CanvasStatePatchSchema.safeParse({
      op: "remove",
      path: "/process_name"
    });

    expect(parsed.success).toBe(true);
  });

  test("AssistantResponseSchema rejects unknown keys", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Patched",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: [],
        flow_steps: []
      },
      canvas_state_patch: [],
      confidence: 0.9,
      unresolved_questions: [],
      next_actions: [],
      deploy_ready: true,
      deploy_readiness_reasons: [],
      unexpected_field: "contract drift"
    });

    expect(parsed.success).toBe(false);
  });

  test("AssistantResponseSchema rejects deploy_ready=false without readiness reasons", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Need more details.",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: ["Timestamp", "Edit Link"],
        flow_steps: []
      },
      canvas_state_patch: [],
      confidence: 0.6,
      unresolved_questions: ["Who approves requests above 5000?"],
      next_actions: ["Answer approver question"],
      deploy_ready: false,
      deploy_readiness_reasons: []
    });

    expect(parsed.success).toBe(false);
  });

  test("AssistantResponseSchema rejects payload missing deploy_readiness_reasons", () => {
    const parsed = AssistantResponseSchema.safeParse({
      chat_reply: "Patched",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: [],
        flow_steps: []
      },
      canvas_state_patch: [],
      confidence: 0.9,
      unresolved_questions: [],
      next_actions: [],
      deploy_ready: true
    });

    expect(parsed.success).toBe(false);
  });

  test("DeploymentStatusSchema accepts payload without progress", () => {
    const parsed = DeploymentStatusSchema.parse({
      deployment_id: "dep-123",
      status: "queued",
      assets: {
        form_id: null,
        spreadsheet_id: null,
        script_id: null
      },
      error: null
    });

    expect(parsed.status).toBe("queued");
  });

  test("DeploymentStatusSchema accepts payload with progress", () => {
    const parsed = DeploymentStatusSchema.parse({
      deployment_id: "dep-123",
      status: "running",
      assets: {
        form_id: "form-id",
        spreadsheet_id: "sheet-id",
        script_id: null
      },
      error: null,
      progress: {
        current_step: "create_script",
        completed_steps: ["create_form", "create_sheet"],
        failed_step: null
      }
    });

    expect(parsed.progress?.current_step).toBe("create_script");
  });

  test("DeploymentStatusSchema rejects unsupported status", () => {
    const parsed = DeploymentStatusSchema.safeParse({
      deployment_id: "dep-123",
      status: "paused",
      assets: {
        form_id: null,
        spreadsheet_id: null,
        script_id: null
      },
      error: null
    });

    expect(parsed.success).toBe(false);
  });

  test("DeploymentCreateRequestSchema accepts canonical payload", () => {
    const parsed = DeploymentCreateRequestSchema.safeParse({
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
        confidence: 0.88,
        unresolved_questions: [],
        deploy_ready: true,
        deploy_readiness_reasons: []
      }
    });

    expect(parsed.success).toBe(true);
  });

  test("DeploymentCreateRequestSchema rejects missing idempotency_key", () => {
    const parsed = DeploymentCreateRequestSchema.safeParse({
      session_id: "sess-123",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: ["Timestamp", "Edit Link"],
        flow_steps: []
      },
      assistant_snapshot: {
        confidence: 0.88,
        unresolved_questions: [],
        deploy_ready: true,
        deploy_readiness_reasons: []
      }
    });

    expect(parsed.success).toBe(false);
  });

  test("DeploymentCreateRequestSchema rejects missing assistant_snapshot", () => {
    const parsed = DeploymentCreateRequestSchema.safeParse({
      session_id: "sess-123",
      canvas_state: {
        process_name: "Expense Approval",
        form_fields: [],
        sheet_headers: ["Timestamp", "Edit Link"],
        flow_steps: []
      },
      idempotency_key: "deploy-sess-123-v1"
    });

    expect(parsed.success).toBe(false);
  });

  test("DeploymentCreateAcceptedSchema accepts queued payload", () => {
    const parsed = DeploymentCreateAcceptedSchema.safeParse({
      deployment_id: "dep-123",
      status: "queued"
    });

    expect(parsed.success).toBe(true);
  });

  test("DeploymentCreateAcceptedSchema rejects invalid status", () => {
    const parsed = DeploymentCreateAcceptedSchema.safeParse({
      deployment_id: "dep-123",
      status: "running"
    });

    expect(parsed.success).toBe(false);
  });

  test("HealthResponseSchema accepts healthy payload", () => {
    const parsed = HealthResponseSchema.parse({
      service: "openai-codex-hackathon",
      status: "healthy",
      checked_at_iso: "2026-02-28T12:00:00.000Z",
      summary: {
        total_dependencies: 2,
        ready_dependencies: 2,
        degraded_dependencies: 0
      },
      dependencies: [
        {
          name: "openai",
          status: "ready",
          required_env: ["OPENAI_API_KEY"],
          missing_env: []
        },
        {
          name: "database",
          status: "ready",
          required_env: ["DATABASE_URL"],
          missing_env: []
        }
      ]
    });

    expect(parsed.status).toBe("healthy");
  });

  test("HealthResponseSchema rejects non-ISO timestamps", () => {
    const parsed = HealthResponseSchema.safeParse({
      service: "openai-codex-hackathon",
      status: "degraded",
      checked_at_iso: "2026/02/28 12:00:00",
      summary: {
        total_dependencies: 1,
        ready_dependencies: 0,
        degraded_dependencies: 1
      },
      dependencies: [
        {
          name: "openai",
          status: "degraded",
          required_env: ["OPENAI_API_KEY"],
          missing_env: ["OPENAI_API_KEY"]
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  test("client and server modules both import shared contracts", () => {
    expect(clientContracts.CanvasStateSchema).toBeDefined();
    expect(serverContracts.CanvasStateSchema).toBeDefined();
    expect(clientContractsSmoke).toBeDefined();
    expect(serverContractsSmoke).toBeDefined();
  });
});
