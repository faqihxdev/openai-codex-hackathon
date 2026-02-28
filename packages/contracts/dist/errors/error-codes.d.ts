export declare const API_ERROR_CODES: readonly ["INVALID_SCHEMA", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "METHOD_NOT_ALLOWED", "CONFLICT", "DEPLOY_NOT_READY", "RATE_LIMITED", "UPSTREAM_UNAVAILABLE", "INTERNAL_ERROR"];
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export interface ApiErrorCodeDefault {
    readonly status: number;
    readonly retryable: boolean;
}
type ApiErrorCodeDefaultsMap = Readonly<Record<ApiErrorCode, ApiErrorCodeDefault>>;
export declare const API_ERROR_CODE_DEFAULTS: ApiErrorCodeDefaultsMap;
export {};
//# sourceMappingURL=error-codes.d.ts.map