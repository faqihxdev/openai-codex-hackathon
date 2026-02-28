import type { ApiErrorResponseBody } from "./api-error-schema.js";
import {
  API_ERROR_CODE_DEFAULTS,
  type ApiErrorCode
} from "./error-codes.js";
import { createApiError, type CreateApiErrorInput } from "./create-api-error.js";

export interface CreateApiErrorResponseInput
  extends Omit<CreateApiErrorInput, "code"> {
  code: ApiErrorCode;
  status?: number;
}

export interface ApiErrorHttpResponse {
  status: number;
  body: ApiErrorResponseBody;
}

export function createApiErrorResponse(
  input: CreateApiErrorResponseInput
): ApiErrorHttpResponse {
  const error = createApiError(input);

  return {
    status: input.status ?? API_ERROR_CODE_DEFAULTS[input.code].status,
    body: {
      error
    }
  };
}
