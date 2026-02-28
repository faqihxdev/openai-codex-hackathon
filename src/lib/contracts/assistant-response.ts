import { z } from "zod";

import { CanvasStateSchema } from "./canvas-state";

export const CanvasPatchOpSchema = z.enum(["add", "remove", "replace"]);

export const CanvasStatePatchSchema = z.object({
  op: CanvasPatchOpSchema,
  path: z.string().regex(/^\//, "path must start with '/'"),
  value: z.unknown().optional()
});

export const AssistantResponseSchema = z.object({
  chat_reply: z.string(),
  canvas_state: CanvasStateSchema,
  canvas_state_patch: z.array(CanvasStatePatchSchema),
  confidence: z.number().min(0).max(1),
  unresolved_questions: z.array(z.string()),
  next_actions: z.array(z.string())
});

export type CanvasPatchOp = z.infer<typeof CanvasPatchOpSchema>;
export type CanvasStatePatch = z.infer<typeof CanvasStatePatchSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
