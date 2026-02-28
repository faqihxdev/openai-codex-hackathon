# Codex Hackathon PRD DAG

Related notes: [[Codex Hackathon]] | [[Codex Hackathon - Backend API Spec Plan]] | [[Codex Hackathon - Frontend Design Style Guide]]

## 1. Purpose

Break the one-day hackathon build into a dependency graph of PRDs so 3-4 people can work in parallel without blocking each other.

## 2. DAG Overview

Legend:

- `Must`: required for demo success
- `Stretch`: only if core path is stable by Hour 7

```mermaid
graph LR
  PRD00[PRD-00 Foundations and Contracts]
  PRD01[PRD-01 Workspace Shell and Style Tokens]
  PRD02[PRD-02 Intent Loop API]
  PRD03[PRD-03 Multimodal Interaction UI]
  PRD04[PRD-04 Canvas and Preview Sync]
  PRD05[PRD-05 Google Deploy Pipeline]
  PRD06[PRD-06 Deploy Status and Readiness Gate]
  PRD07[PRD-07 Demo Rehearsal and Recovery Pack]
  PRD08[PRD-08 Codex App-Server Adapter (Option 1)]

  PRD00 --> PRD01
  PRD00 --> PRD02
  PRD00 --> PRD03
  PRD01 --> PRD04
  PRD02 --> PRD04
  PRD03 --> PRD04
  PRD02 --> PRD05
  PRD05 --> PRD06
  PRD04 --> PRD07
  PRD06 --> PRD07
  PRD02 --> PRD08
  PRD07 --> PRD08
```

## 3. PRD Index and Ownership

| ID | PRD | Type | Depends On | Owner | Timebox |
|---|---|---|---|---|---|
| PRD-00 | Foundations and Contracts | Must | None | P1 | Hour 0-1 |
| PRD-01 | Workspace Shell and Style Tokens | Must | PRD-00 | P3 | Hour 1-3 |
| PRD-02 | Intent Loop API | Must | PRD-00 | P1 | Hour 1-5 |
| PRD-03 | Multimodal Interaction UI | Must | PRD-00 | P3 (+P4) | Hour 1-4 |
| PRD-04 | Canvas and Preview Sync | Must | PRD-01, PRD-02, PRD-03 | P3 | Hour 3-6 |
| PRD-05 | Google Deploy Pipeline | Must | PRD-02 | P2 | Hour 3-7 |
| PRD-06 | Deploy Status and Readiness Gate | Must | PRD-05 | P2 (+P1) | Hour 6-8 |
| PRD-07 | Demo Rehearsal and Recovery Pack | Must | PRD-04, PRD-06 | P1 (+All) | Hour 8-10 |
| PRD-08 | Codex App-Server Adapter (Option 1) | Stretch | PRD-02, PRD-07 | P4 (or P1) | Hour 7-9 |

## 4. PRD Cards

### PRD-00: Foundations and Contracts (Must)

Objective:

- Freeze `canvas_state`, `intent_event`, assistant response, and deployment status schemas.

Acceptance criteria:

- Shared schema file exists and is used by frontend + backend.
- Team agrees on exact endpoint payloads before Hour 1 ends.

Outputs:

- Contract file(s), env template, baseline route map.

### PRD-01: Workspace Shell and Style Tokens (Must)

Objective:

- Implement app shell and custom visual system from style guide.

Acceptance criteria:

- Left interaction rail + right design stage render cleanly on desktop.
- Mobile fallback layout exists.

Outputs:

- Shell layout, token CSS, base components.

### PRD-02: Intent Loop API (Must)

Objective:

- Build `POST /api/v1/intent` with strict schema validation and one fallback path.

Acceptance criteria:

- Valid request returns structured response with `confidence` and `unresolved_questions`.
- Invalid model output handled gracefully (repair or deterministic fallback).

Outputs:

- Intent endpoint, validation layer, adapter boundary for optional Codex mode.

### PRD-03: Multimodal Interaction UI (Must)

Objective:

- Provide chat + guided cards + template input path.

Acceptance criteria:

- User can modify intent through at least 2 interaction modes beyond free text.
- At least one clarifying question can be answered through UI controls.

Outputs:

- Chat panel, card actions, template chooser.

### PRD-04: Canvas and Preview Sync (Must)

Objective:

- Keep conversation outputs, canvas nodes, and form/sheet previews synchronized.

Acceptance criteria:

- Every accepted intent update changes visible state in under 1 second.
- Form and sheet previews reflect current `canvas_state`.

Outputs:

- React Flow mapping + preview components + patch apply logic.

### PRD-05: Google Deploy Pipeline (Must)

Objective:

- Implement live deployment flow (`Form -> Sheet -> Script -> Trigger`).

Acceptance criteria:

- One-click deploy produces real assets with IDs.
- Script writes `Timestamp` and `Edit Link` to sheet on submit.

Outputs:

- Deploy endpoint + orchestration + persistence.

### PRD-06: Deploy Status and Readiness Gate (Must)

Objective:

- Show deploy progress and block unsafe deploys.

Acceptance criteria:

- Deploy button blocked when critical questions unresolved.
- Status UI shows current step and failure reason.

Outputs:

- Deployment status endpoint integration + stepper UI + retry action.

### PRD-07: Demo Rehearsal and Recovery Pack (Must)

Objective:

- Prepare a dependable 3-4 minute demo with backup flow.

Acceptance criteria:

- Two rehearsals completed: golden path and failure-recovery path.
- Backup video and fallback script prepared.

Outputs:

- Demo script, seed data, fallback walkthrough.

### PRD-08: Codex App-Server Adapter (Option 1, Stretch)

Objective:

- Add feature-flagged advanced mode using Codex app-server adapter.

Acceptance criteria:

- App can start/resume thread and run `turn/start`.
- Streamed events visible in UI.
- Failures safely fallback to baseline `POST /api/v1/intent`.

Outputs:

- Internal adapter endpoints + SSE bridge + feature flag wiring.

## 5. Critical Path for One-Day Success

Critical path:

`PRD-00 -> PRD-02 -> PRD-05 -> PRD-06 -> PRD-07`

Keep this path unblocked at all costs. Everything else is secondary.

## 6. Parallelization Windows

- `Hour 1-3`: PRD-01, PRD-02, PRD-03 run in parallel.
- `Hour 3-6`: PRD-04 and PRD-05 run in parallel.
- `Hour 6-8`: PRD-06 while UI polish and integration fixes continue.
- `Hour 8-10`: PRD-07 (all hands) and only then PRD-08 if safe.

## 7. Contingency if One Person Leaves Midday

- Assume P4 may leave at Hour 4.
- By Hour 4, merge all completed P4 work and de-scope anything unfinished.
- Do not let P4 own any critical-path PRD.
- If P4 leaves, cut PRD-08 first.

## 8. Ready-to-Start Assignment

- `P1`: PRD-00 -> PRD-02 -> PRD-07
- `P2`: PRD-05 -> PRD-06
- `P3`: PRD-01 -> PRD-03 -> PRD-04
- `P4`: PRD-03 support -> PRD-08 (only after Hour 7 gate)
