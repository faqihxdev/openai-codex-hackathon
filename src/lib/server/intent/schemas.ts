import { z } from "zod";

import {
  AssistantResponseBaseSchema,
  CanvasStateSchema,
  FlowStepSchema,
  FormFieldSchema,
  IntentEventSchema
} from "@/lib/contracts";

const StrictIntentEventSchema = IntentEventSchema.strict();

const StrictCanvasStateSchema = CanvasStateSchema.extend({
  form_fields: z.array(FormFieldSchema.strict()),
  flow_steps: z.array(FlowStepSchema.strict())
}).strict();

const StrictAssistantResponseSchema = AssistantResponseBaseSchema.extend({
  canvas_state: StrictCanvasStateSchema
})
  .strict()
  .superRefine((value, context) => {
    if (!value.deploy_ready && value.deploy_readiness_reasons.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "deploy_readiness_reasons is required when deploy_ready is false",
        path: ["deploy_readiness_reasons"]
      });
    }
  });

export const ConversationContextSchema = z
  .object({
    unresolved_questions: z.array(z.string()),
    previous_confidence: z.number().min(0).max(1)
  })
  .strict();

export const IntentRequestSchema = z
  .object({
    session_id: z.string().min(1),
    intent_event: StrictIntentEventSchema,
    canvas_state: StrictCanvasStateSchema,
    conversation_context: ConversationContextSchema.optional()
  })
  .strict();

export const IntentSuccessEnvelopeSchema = z
  .object({
    session_id: z.string().min(1),
    response: StrictAssistantResponseSchema
  })
  .strict();

export type IntentRequest = z.infer<typeof IntentRequestSchema>;
export type IntentSuccessEnvelope = z.infer<typeof IntentSuccessEnvelopeSchema>;
