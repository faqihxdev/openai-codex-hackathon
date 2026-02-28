import { z } from "zod";

export const HealthStatusSchema = z.enum(["healthy", "degraded"]);

export const HealthDependencyStatusSchema = z.enum(["ready", "degraded"]);

export const HealthDependencySchema = z
  .object({
    name: z.string().min(1),
    status: HealthDependencyStatusSchema,
    required_env: z.array(z.string().min(1)).min(1),
    missing_env: z.array(z.string().min(1))
  })
  .strict();

export const HealthSummarySchema = z
  .object({
    total_dependencies: z.number().int().nonnegative(),
    ready_dependencies: z.number().int().nonnegative(),
    degraded_dependencies: z.number().int().nonnegative()
  })
  .strict();

export const HealthResponseSchema = z
  .object({
    service: z.string().min(1),
    status: HealthStatusSchema,
    checked_at_iso: z.string().datetime({ offset: true }),
    summary: HealthSummarySchema,
    dependencies: z.array(HealthDependencySchema).min(1)
  })
  .strict();

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type HealthDependencyStatus = z.infer<typeof HealthDependencyStatusSchema>;
export type HealthDependency = z.infer<typeof HealthDependencySchema>;
export type HealthSummary = z.infer<typeof HealthSummarySchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
