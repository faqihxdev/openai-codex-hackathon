import type { ApiErrorResponseBody } from "./api-error-schema.js";
import { type ApiErrorCode } from "./error-codes.js";
import { type CreateApiErrorInput } from "./create-api-error.js";
export interface CreateApiErrorResponseInput extends Omit<CreateApiErrorInput, "code"> {
    code: ApiErrorCode;
    status?: number;
}
export interface ApiErrorHttpResponse {
    status: number;
    body: ApiErrorResponseBody;
}
export declare function createApiErrorResponse(input: CreateApiErrorResponseInput): ApiErrorHttpResponse;
//# sourceMappingURL=create-api-error-response.d.ts.map