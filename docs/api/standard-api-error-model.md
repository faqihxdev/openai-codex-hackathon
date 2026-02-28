# Standard API Error Model

Canonical source contracts:

- `packages/contracts/src/errors/api-error-schema.ts`
- `packages/contracts/src/errors/error-codes.ts`
- `packages/contracts/src/errors/create-api-error-response.ts`

## Envelope Shape

Every error response uses the envelope below.

```json
{
  "error": {
    "code": "INVALID_SCHEMA",
    "message": "Request payload does not match schema",
    "retryable": false,
    "request_id": "req-123456",
    "details": {}
  }
}
```

## Standard Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | enum (`ApiErrorCode`) | Yes | Programmatic canonical error code. |
| `message` | string | Yes | Human-readable summary (`min(1)`). |
| `retryable` | boolean | Yes | Whether client may retry safely. |
| `request_id` | string | Yes | Correlation ID for logs/support (`min(1)`). |
| `details` | object (`Record<string, unknown>`) | Yes | Structured context; defaults to `{}`. |

## Canonical Code Defaults

`API_ERROR_CODE_DEFAULTS` defines the default HTTP status and retryability for each canonical code.

| Code | Default HTTP Status | Default `retryable` |
|---|---:|---|
| `INVALID_SCHEMA` | `400` | `false` |
| `UNAUTHORIZED` | `401` | `false` |
| `FORBIDDEN` | `403` | `false` |
| `NOT_FOUND` | `404` | `false` |
| `METHOD_NOT_ALLOWED` | `405` | `false` |
| `CONFLICT` | `409` | `false` |
| `DEPLOY_NOT_READY` | `409` | `true` |
| `RATE_LIMITED` | `429` | `true` |
| `UPSTREAM_UNAVAILABLE` | `503` | `true` |
| `INTERNAL_ERROR` | `500` | `true` |

## Usage Notes

- `code` is the stable contract for client branching and analytics.
- `message` is operator-facing and may vary by endpoint/context.
- `retryable` defaults from canonical code mapping, but may be overridden when a route needs tighter behavior.
- `request_id` should be propagated into logs and incident/debug tooling.
- `details` should remain machine-friendly (key/value object) and avoid leaking secrets.
