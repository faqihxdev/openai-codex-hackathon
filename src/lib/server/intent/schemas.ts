import { z } from "zod";

import {
  AssistantResponseSchema,
  CanvasStateSchema,
  IntentEventSchema
} from "@/lib/contracts";

export const ConversationContextSchema = z
  .object({
    unresolved_questions: z.array(z.string()),
    previous_confidence: z.number().min(0).max(1)
  })
  .strict();

export const IntentRequestSchema = z
  .object({
    session_id: z.string().min(1),
    intent_event: IntentEventSchema,
    canvas_state: CanvasStateSchema,
    conversation_context: ConversationContextSchema.optional()
  })
  .strict();

export const IntentSuccessEnvelopeSchema = z
  .object({
    session_id: z.string().min(1),
    response: AssistantResponseSchema
  })
  .strict();

export type IntentRequest = z.infer<typeof IntentRequestSchema>;
export type IntentSuccessEnvelope = z.infer<typeof IntentSuccessEnvelopeSchema>;
