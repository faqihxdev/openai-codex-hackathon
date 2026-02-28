import { z } from "zod";

import { CanvasStateSchema } from "./canvas-state";

const TemplateIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "template id must be kebab-case");

export const StarterTemplateSchema = z
  .object({
    id: TemplateIdSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    canvas_state: CanvasStateSchema
  })
  .strict();

export const TemplatesResponseSchema = z
  .object({
    templates: z.array(StarterTemplateSchema).min(1)
  })
  .strict();

export type StarterTemplate = z.infer<typeof StarterTemplateSchema>;
export type TemplatesResponse = z.infer<typeof TemplatesResponseSchema>;
