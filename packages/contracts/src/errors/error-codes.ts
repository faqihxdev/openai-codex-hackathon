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
] as const);

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorCodeDefault {
  readonly status: number;
  readonly retryable: boolean;
}

type ApiErrorCodeDefaultsMap = Readonly<Record<ApiErrorCode, ApiErrorCodeDefault>>;

function freezeDefault(
  status: number,
  retryable: boolean
): Readonly<ApiErrorCodeDefault> {
  return Object.freeze({ status, retryable });
}

export const API_ERROR_CODE_DEFAULTS: ApiErrorCodeDefaultsMap = Object.freeze({
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
