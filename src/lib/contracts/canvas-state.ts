import { z } from "zod";

export const FormFieldTypeSchema = z.enum([
  "SHORT_TEXT",
  "PARAGRAPH",
  "MULTIPLE_CHOICE",
  "DATE"
]);

export const FormFieldSchema = z.object({
  type: FormFieldTypeSchema,
  label: z.string(),
  required: z.boolean()
});

export const FlowStepTypeSchema = z.enum(["input", "process", "output"]);

export const FlowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: FlowStepTypeSchema
});

export const CanvasStateSchema = z.object({
  process_name: z.string(),
  form_fields: z.array(FormFieldSchema),
  sheet_headers: z.array(z.string()),
  flow_steps: z.array(FlowStepSchema)
});

export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FlowStepType = z.infer<typeof FlowStepTypeSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type CanvasState = z.infer<typeof CanvasStateSchema>;
