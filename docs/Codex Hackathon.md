# System Design Document: AI Process Architect MVP

System context: This document outlines the architecture and data contracts for a web application that converts natural language descriptions of human workflows into deployed Google Workspace automated systems.

## 1. Product Goal (Hackathon)

Build an MVP that helps users discover what process they actually need, then deploy a working Google Form + Google Sheet + Apps Script automation in one flow.

### 1.1 Success Criteria

- A first-time user can go from blank state to deployed assets in under 5 minutes.
- The system asks at least one useful clarification question before deployment.
- Users can shape the workflow through more than just chat input.
- Deployment creates real Google assets (not mocks): Form, Sheet, and Script trigger.

## 2. System Overview

The application uses an LLM-driven "intent loop" with multimodal interaction:

- Users provide intent via chat, guided cards, template remix, or direct canvas edits.
- The backend normalizes each interaction into a common `intent_event` contract.
- The LLM returns a structured update that refreshes both conversation and visual system state.
- On user confirmation, the app performs live Google Workspace deployment.

### 2.1 Core Objectives

- Translate unstructured and semi-structured user intent into strict JSON schemas.
- Provide a real-time visual feedback loop (conversation + canvas + structured controls).
- Create Google Workspace assets automatically without manual setup.
- Keep the UX agentic: the system should coach users toward clearer requirements.

### 2.2 Interaction Modes (MVP)

- `Chat input`: free-form user intent and follow-up clarifications.
- `Guided cards`: one-tap choices for common decisions (required fields, approvals, owners, SLAs).
- `Canvas edit`: users can add/remove/relabel steps directly in the diagram.
- `Template remix`: start from prebuilt process templates and customize.

Stretch (post-MVP): voice capture and artifact import (existing Form/Sheet/SOP).

## 3. Architecture Stack

- `Frontend and backend`: Next.js (App Router, server actions/API routes).
- `Styling`: Tailwind CSS.
- `Authentication`: Google OAuth 2.0 Authorization Code + PKCE (no local accounts).
- `LLM integration`: External LLM API with strict JSON schema response enforcement.
- `State validation`: Zod (or equivalent) for runtime schema validation.
- `Visualization`: React Flow for process graph rendering and editing.
- `Target integrations`: Google Forms API, Google Sheets API, Google Apps Script API, Drive API.

## 4. Core Data Contracts

AI agents interacting with state management or API routes MUST adhere to these contracts.

### 4.1 Canonical Canvas State

```json
{
  "canvas_state": {
    "process_name": "string",
    "form_fields": [
      {
        "type": "SHORT_TEXT | PARAGRAPH | MULTIPLE_CHOICE | DATE",
        "label": "string",
        "required": true
      }
    ],
    "sheet_headers": [
      "Timestamp",
      "...dynamic field labels...",
      "Edit Link"
    ],
    "flow_steps": [
      {
        "id": "node-1",
        "label": "string",
        "type": "input | process | output"
      }
    ]
  }
}
```

### 4.2 Intent Event (Input-Normalization Contract)

```json
{
  "intent_event": {
    "id": "evt-uuid",
    "source": "chat | card | canvas | template | voice",
    "intent_type": "add_field | update_field | add_step | remove_step | answer_question | set_constraint",
    "payload": {},
    "timestamp_iso": "2026-02-28T12:00:00Z"
  }
}
```

### 4.3 Assistant Response (Output Contract)

```json
{
  "chat_reply": "string",
  "canvas_state": {},
  "canvas_state_patch": [
    {
      "op": "replace",
      "path": "/process_name",
      "value": "New name"
    }
  ],
  "confidence": 0.86,
  "unresolved_questions": ["Who is the approver?"],
  "next_actions": ["Add approval step", "Deploy"]
}
```

Notes:

- `canvas_state` remains the source of truth.
- `canvas_state_patch` enables efficient UI updates and explainable AI changes.
- Deploy should be blocked when unresolved critical questions remain.

### 4.4 Deployment Status Contract

```json
{
  "deployment_id": "dep-uuid",
  "status": "queued | running | succeeded | failed",
  "assets": {
    "form_id": "string",
    "spreadsheet_id": "string",
    "script_id": "string"
  },
  "error": null
}
```

## 5. Component Interaction Flow

### 5.1 Phase 0: Quick Start

1. User chooses blank start or a template.
2. Frontend initializes baseline `canvas_state`.
3. Agent introduces one high-value clarification (not a long questionnaire).

### 5.2 Phase 1: Iterative Discovery (Intent Loop)

1. **User action:** Any modality emits an `intent_event`.
2. **Normalization:** Backend combines latest `intent_event`, current `canvas_state`, and unresolved questions.
3. **LLM processing:** Prompt requests strict JSON output using the assistant response contract.
4. **Validation:** Server validates JSON schema. If invalid, run one repair pass and fallback to a safe clarifying prompt.
5. **UI update:** Frontend applies patch/snapshot and re-renders chat, cards, and canvas.
6. **Readiness gate:** Deploy button activates only when confidence and required constraints pass threshold.

### 5.3 Phase 2: Execution and Deployment (Live Google APIs)

1. **Trigger:** User clicks `Deploy`.
2. **Auth check:** Ensure valid OAuth token with Forms, Sheets, Drive, and Apps Script scopes.
3. **Google Forms API:** Create Form and append questions from `canvas_state.form_fields`.
4. **Google Sheets API:** Create Sheet and set row 1 to `canvas_state.sheet_headers`.
5. **Apps Script API:** Create script project, inject standard handler, and bind deployment constants.
6. **Trigger setup:** Create installable form submit trigger.
7. **Result:** Return links and IDs for Form/Sheet/Script in deployment status.

## 6. Reliability and Guardrails (Demo-Safe)

- `Invalid LLM JSON`: schema validation + single repair pass + deterministic fallback question.
- `Low confidence`: block deploy and show a targeted guided card.
- `OAuth/token issues`: re-auth flow that preserves draft state.
- `Partial deploy failure`: step-level status and retry from failed step; avoid duplicate asset creation.
- `Quota/rate limits`: exponential backoff with user-visible progress states.

## 7. Standardized Apps Script Template (Injection Payload)

This script is injected during deployment. It maps responses to headers by question title and always appends `Timestamp` and `Edit Link`.

```javascript
const SHEET_ID = "INJECTED_SHEET_ID";
const HEADERS = JSON.parse("INJECTED_HEADERS_JSON");

function onFormSubmit(e) {
  if (!e || !e.response) return;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const formResponse = e.response;
  const timestamp = formResponse.getTimestamp();
  const editUrl = formResponse.getEditResponseUrl();

  const responsesByTitle = {};
  const itemResponses = formResponse.getItemResponses();

  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    var title = itemResponse.getItem().getTitle();
    var raw = itemResponse.getResponse();

    if (Array.isArray(raw)) {
      responsesByTitle[title] = raw.join(", ");
    } else if (raw === null || raw === undefined) {
      responsesByTitle[title] = "";
    } else {
      responsesByTitle[title] = String(raw);
    }
  }

  var row = HEADERS.map(function (header) {
    if (header === "Timestamp") return timestamp;
    if (header === "Edit Link") return editUrl;
    return responsesByTitle[header] || "";
  });

  sheet.appendRow(row);
}
```

## 8. MVP Scope and Boundaries

In scope:

- One workflow per deployment.
- One target Sheet tab.
- Multimodal discovery via chat + guided cards + canvas edits + templates.
- Live deployment to Form, Sheet, and Script.

Out of scope for MVP:

- Multi-step branching automations across multiple forms.
- Role-based multi-user collaboration.
- Advanced policy engines and enterprise governance controls.

## 9. Demo Narrative (3-4 Minutes)

1. Start from template (e.g., expense approval).
2. Refine quickly via guided cards and one natural language prompt.
3. Show live canvas updates and unresolved question resolution.
4. Click `Deploy` and show generated Form/Sheet/Script links.
5. Submit one test response and verify `Timestamp` and `Edit Link` in Sheet.

## 10. Recommended Tech Stack (Hackathon Lean)

### 10.1 Platform and Frameworks

- `App framework`: Next.js (App Router) with TypeScript.
- `UI system`: Tailwind CSS + Radix UI + shadcn/ui primitives (custom-themed, not default theme).
- `Canvas`: React Flow for process graph editing.
- `Schema validation`: Zod for all API and LLM contracts.
- `Auth`: Auth.js with Google OAuth.
- `Database`: Postgres (Neon or Supabase).
- `ORM`: Drizzle ORM.
- `Async jobs`: Inngest (or Trigger.dev) for deployment pipeline and retries.
- `LLM layer`: Vercel AI SDK + selected model provider.
- `Google integration`: `googleapis` Node SDK.
- `Hosting`: Vercel for app; optional worker host if long-running sidecar needed.

### 10.2 Exact Package Direction

Core app:

- `next`, `react`, `react-dom`, `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`
- `@radix-ui/*` primitives + shadcn-generated components
- `reactflow`
- `zod`
- `drizzle-orm`, `drizzle-kit`, `pg`
- `next-auth` (Auth.js)
- `googleapis`
- `ai` (Vercel AI SDK)
- `inngest`

Helpful utilities:

- `clsx`, `tailwind-merge`
- `react-hook-form`
- `date-fns`

Intentionally skipped for hackathon speed:

- Sentry, PostHog, heavy observability stacks
- microservices/event-bus decomposition

## 11. Suggested Repo Structure

```text
src/
  app/
    (marketing)/
    workspace/
      page.tsx
    api/
      v1/
        intent/route.ts
        deployments/route.ts
        deployments/[deploymentId]/route.ts
        deployments/[deploymentId]/retry/route.ts
        templates/route.ts
        health/route.ts
  components/
    shell/
    chat/
    cards/
    canvas/
    deploy/
  lib/
    auth/
    db/
    llm/
    google/
    schemas/
    prompts/
    utils/
  jobs/
    deploy-workflow.ts
  styles/
    tokens.css
    globals.css
drizzle/
docs/
```

## 12. One-Day Build Plan (Hackathon)

This schedule assumes a single day and prioritizes a reliable end-to-end demo over breadth.

### 12.1 Must-Ship Demo Scope

- One starter template (`expense-approval`).
- One multimodal discovery pass (`chat + guided cards`; canvas editing can be basic).
- One successful live deploy (`Form -> Sheet -> Script -> Trigger`).
- One visible readiness gate (`unresolved_questions` blocks deploy).

### 12.2 Hour-by-Hour Plan

1. **Hour 0-1: Foundation**
   - Create project scaffold, auth wiring, and tokenized design system.
   - Define shared Zod contracts (`canvas_state`, `intent_event`, deploy status).
2. **Hour 1-3: Core UX loop**
   - Build workspace shell (left interaction panel + right canvas/preview).
   - Implement template load + minimal guided cards + chat input.
3. **Hour 3-5: Intent API**
   - Build `POST /api/v1/intent` with strict JSON validation.
   - Add one fallback behavior for malformed LLM output.
4. **Hour 5-7: Deployment pipeline**
   - Build `POST /api/v1/deployments` and `GET /api/v1/deployments/{id}`.
   - Implement sequential Google creation steps and persist status.
5. **Hour 7-8: Demo resilience**
   - Add deploy stepper UI and clear error states.
   - Add one retry path (full deploy retry is acceptable for hackathon).
6. **Hour 8-9: Polish and narrative**
   - Tighten spacing/typography/microcopy per style guide.
   - Remove unfinished UI branches and simplify flow.
7. **Hour 9-10: Rehearsal and backup**
   - Run two scripted demos (golden path + one failure recovery).
   - Record a short backup walkthrough video in case of live API issues.

### 12.3 Scope Cuts if Behind Schedule

Cut in this exact order:

1. Advanced canvas editing interactions.
2. Multiple templates (keep exactly one).
3. Per-step retry endpoint (keep single "retry deploy" action).
4. Any Codex app-server integration.

### 12.4 Definition of Done (Hackathon)

- A new user can complete flow in under 5 minutes.
- The app asks at least one high-value clarification before deploy.
- Deploy creates real Google assets and shows links in UI.
- Team can deliver the 3-4 minute demo without ad-lib debugging.

### 12.5 Team Split (3-4 People, One May Leave Early)

Use role labels so assignments stay clear even if one person leaves.

- `P1 (Lead Integrator, full day)`: owns shared contracts, feature flags, final branch integration, and demo runbook.
- `P2 (Backend and Google APIs, full day)`: owns OAuth, deployment pipeline, deploy status persistence, and retry behavior.
- `P3 (Frontend and UX, full day)`: owns workspace UI, guided cards, canvas/preview sync, and deploy stepper UX.
- `P4 (Flex, may leave halfway)`: owns non-critical tasks only (template content, loading/error polish, optional Codex adapter wiring).

Mandatory handoffs:

1. `Hour 2`: all schema contracts frozen and shared.
2. `Hour 4`: P4 handoff checkpoint; merge completed work and drop unfinished stretch tasks.
3. `Hour 7`: feature freeze and bug-fix only.

If P4 leaves before Hour 4:

- P1 absorbs only critical glue work.
- P2 and P3 continue uninterrupted on core path.
- Immediately cut in this order: optional Codex adapter, advanced canvas interactions, extra templates.

## 13. Codex App Server Integration (Selected: Option 1)

Decision: Use a feature-flagged adapter integration.

### 13.1 What Option 1 Means

- Keep the current Next.js intent/deploy path as the default and most reliable path.
- Add Codex app-server as an optional advanced agent mode behind a feature flag.
- If the adapter fails or times out, fall back to baseline intent API without breaking the demo.

### 13.2 Architecture Shape

- Run `codex app-server` as a long-running sidecar service.
- Add a thin adapter in Next.js backend that:
  - initializes app-server connections
  - starts/resumes threads (`thread/start`, `thread/resume`)
  - starts turns (`turn/start`, optional `turn/steer`)
  - relays event notifications to frontend via SSE
- Persist `thread_id` per user session in Postgres.
- Handle overload error `-32001` with exponential backoff and jitter.

### 13.3 Minimal Method Surface for Hackathon

Implement only this subset:

- `initialize` + `initialized`
- `thread/start` and `thread/resume`
- `turn/start`
- Stream these notifications: `item/agentMessage/delta`, `item/completed`, `turn/completed`

Defer all other app-server features (review mode, rollback, compaction, advanced approvals).

### 13.4 One-Day Execution Rule

Only proceed with app-server adapter after the core demo path is stable:

1. Intent loop working with strict JSON contracts.
2. Live Google deploy working end-to-end.
3. Basic deploy status UI and failure message present.

If any of these are incomplete by Hour 7, skip app-server integration for this hackathon.

### 13.5 Environment Flags

- `ENABLE_CODEX_APP_SERVER=false` (default)
- `CODEX_APP_SERVER_URL=ws://127.0.0.1:4500` (or sidecar endpoint)

UI should expose an "Advanced Agent Mode" toggle only when `ENABLE_CODEX_APP_SERVER=true`.
