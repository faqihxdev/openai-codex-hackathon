# Issue #17 Implementation: Strict Assistant Validation + Repair + Deterministic Fallback

## Context

- Parent epic: `#4` (`[EPIC][PRD-02] Intent Loop API`).
- This implementation covers child task `#17`.
- Base intent handler skeleton from `#16` already existed at `src/lib/server/intent/handler.ts`.

## Implemented Scope

- Enforced strict downstream contract validation using `IntentSuccessEnvelopeSchema` before returning success.
- Added a single repair pass for malformed assistant output via optional `repairIntent` dependency.
- Added deterministic fallback response when:
  - initial assistant output is invalid and no repair dependency is provided,
  - repair output is still invalid, or
  - repair attempt throws.

## Behavior Changes

1. `processIntent` now accepts/returns `unknown` to model real-world LLM output variance.
2. Invalid assistant payload no longer returns `500 invalid_assistant_response`.
3. Handler attempts one repair call with:
   - original request,
   - resolved access context,
   - invalid raw response,
   - schema validation issues.
4. If repair does not produce a valid contract payload, handler returns `200` with deterministic clarifying response:
   - unchanged `canvas_state`,
   - empty `canvas_state_patch`,
   - low confidence (`0.2`),
   - one deterministic unresolved question derived from `intent_type`,
   - deterministic next actions.

## Tests Updated

File: `src/lib/server/intent/__tests__/intent-handler.spec.ts`

- Replaced prior invalid-assistant-response `500` expectation with deterministic fallback `200`.
- Added repair success path test.
- Added repair-invalid fallback path test.
- Added repair-throw fallback path test.
- Added assertion that repair is not called for already-valid responses.

## Verification

Executed with a temporary Vitest config because root `vitest.config.ts` includes only `src/app/**` and `src/components/**` tests:

```bash
pnpm exec vitest run --config /tmp/vitest.intent.config.ts
```

Result:

- `src/lib/server/intent/__tests__/auth.spec.ts` passed.
- `src/lib/server/intent/__tests__/schemas.spec.ts` passed.
- `src/lib/server/intent/__tests__/intent-handler.spec.ts` passed.
