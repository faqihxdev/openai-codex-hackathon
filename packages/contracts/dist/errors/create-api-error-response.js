import { API_ERROR_CODE_DEFAULTS } from "./error-codes.js";
import { createApiError } from "./create-api-error.js";
export function createApiErrorResponse(input) {
    const error = createApiError(input);
    return {
        status: input.status ?? API_ERROR_CODE_DEFAULTS[input.code].status,
        body: {
            error
        }
    };
}
//# sourceMappingURL=create-api-error-response.js.map