import { z } from "zod";

export const IntentSourceSchema = z.enum([
  "chat",
  "card",
  "canvas",
  "template",
  "voice"
]);

export const IntentTypeSchema = z.enum([
  "add_field",
  "update_field",
  "add_step",
  "remove_step",
  "answer_question",
  "set_constraint"
]);

export const IntentEventSchema = z.object({
  id: z.string(),
  source: IntentSourceSchema,
  intent_type: IntentTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  timestamp_iso: z.string().datetime({ offset: true })
});

export type IntentSource = z.infer<typeof IntentSourceSchema>;
export type IntentType = z.infer<typeof IntentTypeSchema>;
export type IntentEvent = z.infer<typeof IntentEventSchema>;
