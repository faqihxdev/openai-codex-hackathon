import { apiErrorSchema, type ApiError } from "./api-error-schema.js";
import {
  API_ERROR_CODE_DEFAULTS,
  type ApiErrorCode
} from "./error-codes.js";

export interface CreateApiErrorInput {
  code: ApiErrorCode;
  request_id: string;
  message?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export function createApiError(input: CreateApiErrorInput): ApiError {
  const defaults = API_ERROR_CODE_DEFAULTS[input.code];
  const candidate = {
    code: input.code,
    message: input.message ?? input.code,
    retryable: input.retryable ?? defaults.retryable,
    request_id: input.request_id,
    details: input.details ?? {}
  };

  return apiErrorSchema.parse(candidate);
}
