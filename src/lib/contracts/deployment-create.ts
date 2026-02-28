import { z } from "zod";

import { CanvasStateSchema } from "./canvas-state";

export const DeploymentAssistantSnapshotSchema = z
  .object({
    confidence: z.number().min(0).max(1),
    unresolved_questions: z.array(z.string()),
    deploy_ready: z.boolean(),
    deploy_readiness_reasons: z.array(z.string())
  })
  .strict();

export const DeploymentCreateRequestSchema = z
  .object({
    session_id: z.string().min(1),
    canvas_state: CanvasStateSchema,
    idempotency_key: z.string().min(1).max(128),
    assistant_snapshot: DeploymentAssistantSnapshotSchema
  })
  .strict();

export const DeploymentCreateAcceptedSchema = z
  .object({
    deployment_id: z.string().min(1),
    status: z.literal("queued")
  })
  .strict();

export type DeploymentAssistantSnapshot = z.infer<typeof DeploymentAssistantSnapshotSchema>;
export type DeploymentCreateRequest = z.infer<typeof DeploymentCreateRequestSchema>;
export type DeploymentCreateAccepted = z.infer<typeof DeploymentCreateAcceptedSchema>;

