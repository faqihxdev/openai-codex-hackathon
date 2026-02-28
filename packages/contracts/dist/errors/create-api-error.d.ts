import { type ApiError } from "./api-error-schema.js";
import { type ApiErrorCode } from "./error-codes.js";
export interface CreateApiErrorInput {
    code: ApiErrorCode;
    request_id: string;
    message?: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
}
export declare function createApiError(input: CreateApiErrorInput): ApiError;
//# sourceMappingURL=create-api-error.d.ts.map