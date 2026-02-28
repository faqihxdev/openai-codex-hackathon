import { z } from "zod";

export const DeploymentStatusValueSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed"
]);

export const DeploymentAssetsSchema = z.object({
  form_id: z.string().nullable(),
  spreadsheet_id: z.string().nullable(),
  script_id: z.string().nullable()
});

export const DeploymentErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const DeploymentProgressSchema = z.object({
  current_step: z.string(),
  completed_steps: z.array(z.string()),
  failed_step: z.string().nullable()
});

export const DeploymentStatusSchema = z.object({
  deployment_id: z.string(),
  status: DeploymentStatusValueSchema,
  assets: DeploymentAssetsSchema,
  error: z.union([z.null(), DeploymentErrorSchema]),
  progress: DeploymentProgressSchema.optional()
});

export type DeploymentStatusValue = z.infer<typeof DeploymentStatusValueSchema>;
export type DeploymentAssets = z.infer<typeof DeploymentAssetsSchema>;
export type DeploymentError = z.infer<typeof DeploymentErrorSchema>;
export type DeploymentProgress = z.infer<typeof DeploymentProgressSchema>;
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;
