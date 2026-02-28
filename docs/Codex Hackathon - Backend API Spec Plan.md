# Codex Hackathon Backend API Spec Plan

Related design note: [[Codex Hackathon]]

## 1. Purpose

Define a clear backend API contract for the AI Process Architect MVP so the team can implement quickly, demo reliably, and support an agentic user experience beyond chat-only input.

## 2. Scope for MVP

In scope:

- Intent loop APIs for multimodal interactions (`chat`, `card`, `canvas`, `template`).
- Deployment orchestration APIs for live Google Form, Sheet, and Apps Script creation.
- Template listing and deployment status polling APIs.
- Shared error model, validation rules, and readiness gates.

Out of scope (post-MVP):

- Multi-workflow orchestration and branching policy engines.
- Team collaboration features (roles, permissions, shared editing).
- Public third-party integrations beyond Google Workspace.

## 3. API Design Principles

- Versioned routes: `/api/v1/...`.
- JSON request/response only.
- Server-side schema validation on every write endpoint.
- Deterministic contracts for agent outputs (`confidence`, `unresolved_questions`, `patch`).
- Idempotency for deploy creation to avoid duplicate Google assets.
- Structured error payloads with retry hints.

## 4. Shared Contracts (Draft)

Canonical route map source: [`docs/api/v1-route-map.md`](./api/v1-route-map.md).
Canonical error model source: [`docs/api/standard-api-error-model.md`](./api/standard-api-error-model.md).

### 4.1 Intent Event

```json
{
  "id": "evt-uuid",
  "source": "chat | card | canvas | template | voice",
  "intent_type": "add_field | update_field | add_step | remove_step | answer_question | set_constraint",
  "payload": {},
  "timestamp_iso": "2026-02-28T12:00:00Z"
}
```

### 4.2 Assistant Response

```json
{
  "chat_reply": "string",
  "canvas_state": {},
  "canvas_state_patch": [
    {
      "op": "replace",
      "path": "/process_name",
      "value": "Expense Approval"
    }
  ],
  "confidence": 0.86,
  "unresolved_questions": ["Who approves expenses over 5000?"],
  "next_actions": ["Add approver field", "Deploy"]
}
```

### 4.3 Deployment Status

```json
{
  "deployment_id": "dep-uuid",
  "status": "queued | running | succeeded | failed",
  "assets": {
    "form_id": "string",
    "spreadsheet_id": "string",
    "script_id": "string"
  },
  "error": null,
  "progress": {
    "current_step": "create_sheet",
    "completed_steps": ["create_form"],
    "failed_step": null
  }
}
```

### 4.4 Standard API Error

```json
{
  "error": {
    "code": "INVALID_SCHEMA",
    "message": "Request payload does not match schema",
    "retryable": false,
    "request_id": "req-uuid",
    "details": {}
  }
}
```

## 5. Endpoint Inventory (MVP)

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/v1/intent` | Process one normalized interaction and return updated state | Required |
| `POST` | `/api/v1/deployments` | Start live Google deployment | Required |
| `GET` | `/api/v1/deployments/{deployment_id}` | Poll deployment status and asset IDs | Required |
| `POST` | `/api/v1/deployments/{deployment_id}/retry` | Retry failed step from latest checkpoint | Required |
| `GET` | `/api/v1/templates` | Return starter process templates | Required |
| `GET` | `/api/v1/health` | Service and dependency readiness | None |

## 6. Endpoint Drafts

### 6.1 `POST /api/v1/intent`

Purpose:

- Receive one user action from any input channel.
- Run LLM update with strict schema.
- Return updated `canvas_state` and guidance for next interaction.

Request:

```json
{
  "session_id": "ses-uuid",
  "intent_event": {},
  "canvas_state": {},
  "conversation_context": {
    "unresolved_questions": [],
    "previous_confidence": 0.72
  }
}
```

Response:

```json
{
  "chat_reply": "I added an approval step. Who should approve requests above 5000?",
  "canvas_state": {},
  "canvas_state_patch": [],
  "confidence": 0.88,
  "unresolved_questions": ["Who approves requests above 5000?"],
  "next_actions": ["Set approver", "Deploy"]
}
```

Validation and behavior notes:

- Reject invalid schema with `400 INVALID_SCHEMA`.
- If LLM output is invalid, run one repair attempt before fallback.
- Add `deploy_ready: false` if critical unresolved questions remain.

### 6.2 `POST /api/v1/deployments`

Purpose:

- Kick off real Google Workspace deployment from current state.

Request:

```json
{
  "session_id": "ses-uuid",
  "canvas_state": {},
  "idempotency_key": "deploy-ses-uuid-v3"
}
```

Response (`202 Accepted`):

```json
{
  "deployment_id": "dep-uuid",
  "status": "queued"
}
```

Execution steps:

1. Validate deploy readiness gate.
2. Verify OAuth token and scopes.
3. Create Form and questions.
4. Create Sheet and headers.
5. Create Script, inject handler, create trigger.
6. Persist status and return links.

### 6.3 `GET /api/v1/deployments/{deployment_id}`

Purpose:

- Poll deploy progress and retrieve final asset IDs/URLs.

Response:

```json
{
  "deployment_id": "dep-uuid",
  "status": "running",
  "assets": {
    "form_id": null,
    "spreadsheet_id": null,
    "script_id": null
  },
  "error": null,
  "progress": {
    "current_step": "create_script",
    "completed_steps": ["create_form", "create_sheet"],
    "failed_step": null
  }
}
```

### 6.4 `POST /api/v1/deployments/{deployment_id}/retry`

Purpose:

- Retry from failed step without duplicating previously created assets.

Response:

```json
{
  "deployment_id": "dep-uuid",
  "status": "running"
}
```

### 6.5 `GET /api/v1/templates`

Purpose:

- Return curated starter workflows for fast onboarding.

Example response:

```json
{
  "templates": [
    {
      "id": "expense-approval",
      "name": "Expense Approval",
      "description": "Submit, review, and track expense requests",
      "canvas_state": {}
    }
  ]
}
```

## 7. Auth, Security, and Quotas

- Use Google OAuth 2.0 Authorization Code + PKCE.
- Required scopes: Forms, Sheets, Drive, Apps Script.
- Keep tokens server-side only; never expose refresh tokens to client.
- Add per-user rate limits for `intent` and `deployments` endpoints.
- Log request IDs for traceability.

## 8. Readiness Gates for Deploy

Deployment endpoint should block when:

- `confidence` is below configured threshold (for MVP, e.g. `< 0.75`).
- Critical `unresolved_questions` list is not empty.
- `sheet_headers` do not match final `form_fields` mapping rules.

## 9. Suggested Implementation Order

1. Define shared Zod schemas and error model.
2. Implement `POST /api/v1/intent` with strict response validation.
3. Implement deploy orchestration (`POST /api/v1/deployments`, `GET /api/v1/deployments/{deployment_id}`).
4. Add retry endpoint and idempotency protections.
5. Add templates endpoint for quick-start UX.
6. Add health endpoint and minimal telemetry.

## 10. Open Questions to Resolve Before Final Spec

- Should `canvas_state` be persisted server-side per session, or passed fully by client each request?
- Is deployment synchronous-with-polling enough, or should we add SSE updates for live progress?
- What exact confidence policy should gate deploy (global threshold vs field-specific checks)?
- Should we support a dry-run endpoint in MVP for safer demos?

## 11. Codex App-Server Adapter (Selected Option 1)

This is an optional advanced mode behind a feature flag. Core APIs remain the default path.

### 11.1 Adapter Endpoints (Internal)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/agent/threads/start` | Start or resume Codex thread for session |
| `POST` | `/api/v1/agent/turns/start` | Send one user input turn to Codex app-server |
| `GET` | `/api/v1/agent/stream?session_id=...` | SSE stream for Codex item/turn notifications |

These can be marked internal and hidden from public SDK/docs during hackathon.

### 11.2 Fallback Contract

- If adapter fails, timeout, or returns overload (`-32001`), backend returns:

```json
{
  "fallback": true,
  "reason": "CODEX_ADAPTER_UNAVAILABLE"
}
```

- Frontend then calls baseline `POST /api/v1/intent` path.

### 11.3 Retry Policy for `-32001`

- Max retries: 3
- Backoff: exponential with jitter (`250ms`, `750ms`, `1750ms` target windows)
- If retries exhausted, return fallback response and preserve user request.
