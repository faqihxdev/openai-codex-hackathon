# Issue #16 Design: POST /api/v1/intent Skeleton

## Context

- Parent epic: `#4` (`[EPIC][PRD-02] Intent Loop API`).
- This design covers only child task `#16`.
- Existing dependencies are in place:
  - Shared contracts from `#11` under `src/lib/contracts`.
  - Standard API error model from `#12` under `packages/contracts/src/errors`.

## Goals

- Implement the request handling skeleton for `POST /api/v1/intent`.
- Enforce request validation and auth/session guard behavior.
- Return a contract-safe response envelope for both success and failure.
- Keep implementation framework-agnostic so transport routing can be added later.

## Non-Goals

- No live HTTP framework route wiring in this task.
- No LLM repair/fallback logic from `#17` yet.
- No deploy readiness evaluator from `#18` yet.

## Proposed Architecture

Create a focused server intent module at `src/lib/server/intent/`:

- `schemas.ts`
  - Defines request schema for `session_id`, `intent_event`, `canvas_state`, and optional `conversation_context`.
  - Defines success envelope schema.
- `auth.ts`
  - Defines auth/session context types.
  - Exposes guard function for identity and session authorization checks.
- `handler.ts`
  - Implements the endpoint orchestration (`validate -> authorize -> process -> envelope`).
  - Uses dependency injection for `authorize`, `processIntent`, and `requestIdFactory`.
- `index.ts`
  - Public exports.

This keeps the task independently testable and allows `#17` to replace processor internals without changing request, auth, or error boundaries.

## Data Flow

1. Parse incoming payload with Zod.
   - Reuse `IntentEventSchema` and `CanvasStateSchema` from shared contracts.
   - Reject invalid input as `INVALID_SCHEMA` via shared error helper.
2. Run auth/session guard.
   - Missing identity -> `UNAUTHORIZED`.
   - Identity present but session access denied -> `FORBIDDEN`.
3. Call deterministic placeholder processor.
   - For `#16`, a predictable processor returns a valid `AssistantResponse`.
4. Validate processor output with `AssistantResponseSchema`.
   - Contract drift is converted to `INTERNAL_ERROR` response envelope.
5. Return typed success envelope.
   - Envelope shape: `{ session_id, response }` where `response` satisfies `AssistantResponseSchema`.

## Error Handling Contract

All failures use standard API error envelope from `packages/contracts/src/errors`:

- `400 INVALID_SCHEMA` for payload/schema failures.
- `401 UNAUTHORIZED` for missing or invalid authentication state.
- `403 FORBIDDEN` for denied session access.
- `500 INTERNAL_ERROR` for unexpected exceptions or invalid internal processor output.

Every error response includes:

- `request_id` from `requestIdFactory`.
- `retryable` derived from canonical code defaults.
- `details` as machine-readable context.

## Testing Strategy

Add tests at `src/lib/server/intent/__tests__/intent-handler.spec.ts`:

- valid request + authorized session returns success envelope.
- invalid request schema returns `INVALID_SCHEMA` envelope.
- missing auth identity returns `UNAUTHORIZED` envelope.
- denied session authorization returns `FORBIDDEN` envelope.
- processor exception maps to `INTERNAL_ERROR` envelope.
- success payload remains contract-valid (`AssistantResponseSchema`).

Verification commands:

```bash
pnpm contracts:test
pnpm contracts:typecheck
```

## Integration Notes for Follow-Up Tasks

- `#17` should replace placeholder processor with strict validation + one repair pass + deterministic fallback.
- `#18` should extend success payload with deploy readiness evaluation output once rules are defined.

## Implementation Evidence

- Implemented module path: `src/lib/server/intent/`
- Tests added:
  - `src/lib/server/intent/__tests__/schemas.spec.ts`
  - `src/lib/server/intent/__tests__/auth.spec.ts`
  - `src/lib/server/intent/__tests__/intent-handler.spec.ts`

Verification commands run:

```bash
pnpm --filter @openai-codex-hackathon/contracts exec vitest run --root ../.. src/lib/server/intent/__tests__/schemas.spec.ts src/lib/server/intent/__tests__/auth.spec.ts src/lib/server/intent/__tests__/intent-handler.spec.ts
pnpm --filter @openai-codex-hackathon/contracts typecheck
```
