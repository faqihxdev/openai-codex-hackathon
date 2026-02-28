import { apiErrorSchema } from "./api-error-schema.js";
import { API_ERROR_CODE_DEFAULTS } from "./error-codes.js";
export function createApiError(input) {
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
//# sourceMappingURL=create-api-error.js.map