import { z } from "zod";

import { CanvasStateSchema } from "./canvas-state";

export const CanvasPatchOpSchema = z.enum(["add", "remove", "replace"]);

const CanvasStatePatchPathSchema = z
  .string()
  .regex(/^\//, "path must start with '/'");

const RequiredPatchValueSchema = z
  .unknown()
  .refine((value) => value !== undefined, "value is required for add/replace operations");

export const CanvasStatePatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    path: CanvasStatePatchPathSchema,
    value: RequiredPatchValueSchema
  }),
  z.object({
    op: z.literal("remove"),
    path: CanvasStatePatchPathSchema,
    value: z.unknown().optional()
  }),
  z.object({
    op: z.literal("replace"),
    path: CanvasStatePatchPathSchema,
    value: RequiredPatchValueSchema
  })
]);

export const AssistantResponseSchema = z
  .object({
    chat_reply: z.string(),
    canvas_state: CanvasStateSchema,
    canvas_state_patch: z.array(CanvasStatePatchSchema),
    confidence: z.number().min(0).max(1),
    unresolved_questions: z.array(z.string()),
    next_actions: z.array(z.string()),
    deploy_ready: z.boolean(),
    deploy_readiness_reasons: z.array(z.string())
  })
  .strict();

export type CanvasPatchOp = z.infer<typeof CanvasPatchOpSchema>;
export type CanvasStatePatch = z.infer<typeof CanvasStatePatchSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
