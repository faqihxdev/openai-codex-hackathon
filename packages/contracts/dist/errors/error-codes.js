export const API_ERROR_CODES = Object.freeze([
    "INVALID_SCHEMA",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    "CONFLICT",
    "DEPLOY_NOT_READY",
    "RATE_LIMITED",
    "UPSTREAM_UNAVAILABLE",
    "INTERNAL_ERROR"
]);
function freezeDefault(status, retryable) {
    return Object.freeze({ status, retryable });
}
export const API_ERROR_CODE_DEFAULTS = Object.freeze({
    INVALID_SCHEMA: freezeDefault(400, false),
    UNAUTHORIZED: freezeDefault(401, false),
    FORBIDDEN: freezeDefault(403, false),
    NOT_FOUND: freezeDefault(404, false),
    METHOD_NOT_ALLOWED: freezeDefault(405, false),
    CONFLICT: freezeDefault(409, false),
    DEPLOY_NOT_READY: freezeDefault(409, true),
    RATE_LIMITED: freezeDefault(429, true),
    UPSTREAM_UNAVAILABLE: freezeDefault(503, true),
    INTERNAL_ERROR: freezeDefault(500, true)
});
//# sourceMappingURL=error-codes.js.map