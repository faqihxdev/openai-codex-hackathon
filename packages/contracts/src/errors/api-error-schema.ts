import { z } from "zod";

import { API_ERROR_CODES } from "./error-codes.js";

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const apiErrorSchema = z
  .object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    request_id: z.string().min(1),
    details: z.record(z.string(), z.unknown())
  })
  .strict();

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorSchema
  })
  .strict();

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorResponseBody = z.infer<typeof apiErrorResponseSchema>;
