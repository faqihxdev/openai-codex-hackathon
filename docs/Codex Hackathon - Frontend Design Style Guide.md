# Codex Hackathon Frontend Design Style Guide

Related notes: [[Codex Hackathon]] | [[Codex Hackathon - Backend API Spec Plan]]

## 1. Design Intent

This product should feel like a sharp workflow studio, not a chatbot toy.

Target impression in 5 seconds:

- "This is credible enough to run operations."
- "The AI is helping me think, not just generating text."
- "I can shape the system visually, not only by typing prompts."

## 2. Visual Direction (Locked)

Direction name: **Editorial Control Room**

Use a warm, tactile base with high-contrast ink and bold signal accents.

- Warm paper-like background, not flat white.
- Strong typography hierarchy with a distinctive headline font.
- Data and controls should feel precise and operational.
- Avoid futuristic neon, heavy glassmorphism, and generic gradient blobs.

## 3. Anti-Slop Rules (Non-Negotiable)

- Do not use default AI-stack visuals (Inter + purple gradients + rounded cards everywhere).
- Do not center everything in one generic hero stack.
- Do not rely on chat bubbles as the only interaction surface.
- Do not use vague, fluffy microcopy ("magic", "revolutionary", "seamless").
- Do not over-animate every element.

## 4. Core UI Principles

- **Agentic over chatty:** every AI message should include an actionable UI control.
- **State over prose:** show workflow state, confidence, and unresolved questions visually.
- **Direct manipulation:** users can edit nodes and fields directly on canvas.
- **Fast clarity:** one screen should answer: what exists, what is missing, what to do next.

## 5. Design Tokens

### 5.1 Typography

- Display/headline: `Syne` (600-700)
- Body/UI: `Archivo` (400-600)
- Mono/meta: `IBM Plex Mono` (400-500)

Type scale:

- `h1`: 44/48, weight 700, tight tracking
- `h2`: 30/36, weight 650
- `h3`: 22/28, weight 600
- `body-lg`: 18/28
- `body`: 16/24
- `meta`: 13/18, mono

### 5.2 Color Tokens

```css
:root {
  --bg: #f3efe6;
  --surface: #fffdf8;
  --surface-2: #efe7da;
  --ink: #1e1a16;
  --muted: #6f665c;
  --line: #d6ccbd;
  --accent: #0f766e;
  --accent-2: #d9480f;
  --success: #2f855a;
  --warning: #b7791f;
  --danger: #c53030;
}
```

Usage ratios:

- 70% neutral surfaces (`--bg`, `--surface`)
- 20% ink and muted text (`--ink`, `--muted`)
- 10% accents (`--accent`, `--accent-2`) only for key actions and status

### 5.3 Shape, Spacing, and Depth

- Border radius: 12px cards, 10px inputs, 999px chips
- Border style: 1px solid `--line` on most surfaces
- Shadow: subtle, directional, low blur (`0 6px 20px rgba(30, 26, 22, 0.08)`)
- Spacing scale: 4, 8, 12, 16, 24, 32, 48

## 6. Layout System

### 6.1 Desktop

- 12-column grid with max width 1400px
- Split workspace:
  - Left rail (4 columns): conversation + guided cards
  - Right stage (8 columns): process canvas + live schema preview
- Sticky top action bar with status + `Deploy` action

### 6.2 Mobile

- Stacked flow with segmented controls: `Discuss | Design | Deploy`
- Canvas opens full-screen modal for direct editing
- Keep primary action pinned at bottom

## 7. Key Screens and Components

### 7.1 Workspace Shell

- Top bar: project name, confidence meter, unresolved count, deploy state
- Left panel tabs: `Conversation`, `Questions`, `Templates`
- Right panel tabs: `Canvas`, `Form Preview`, `Sheet Preview`

### 7.2 Conversation and Guidance

- AI responses must pair with controls:
  - quick choices (chips)
  - yes/no toggles
  - structured mini-forms for missing fields
- Display `why this question` under each clarifying prompt (small meta text)

### 7.3 Canvas Nodes

- Node types have distinct visual signatures:
  - Input: outlined with accent border
  - Process: neutral filled card
  - Output: accent-tinted background
- Every node shows inline edit affordances on hover/focus

### 7.4 Deployment State UI

- Show stepper (`Auth -> Form -> Sheet -> Script -> Trigger`) with real-time status
- On failure, expose exact failed step and one-click retry
- On success, show direct links to created assets

## 8. Motion Language

- Use motion to explain state transitions, not decorate everything.
- Durations:
  - 120ms hover/focus
  - 220ms panel transitions
  - 320ms page-level reveals
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Stagger only in first-load moments (max 6 elements)

## 9. Microcopy Style

- Plain and operational tone.
- Prefer specific prompts:
  - Good: "Who approves requests above 5000?"
  - Bad: "Tell me more about your process."
- Use action labels, not abstract labels:
  - `Add approval step`
  - `Mark as required`
  - `Deploy to Google Workspace`

## 10. Accessibility and Quality Bar

- WCAG AA contrast minimum for all text and controls.
- Keyboard-first support for all canvas and form interactions.
- Visible focus state on every interactive element.
- Minimum tap target 44x44 on mobile.

## 11. Implementation Notes for Tailwind

- Define tokens in `:root` and map to Tailwind theme extension.
- Use semantic utility classes (`text-ink`, `bg-surface`, `border-line`) instead of raw hex in components.
- Limit one-off values; prefer tokenized spacing/type scales.
- Build reusable primitives first: `AppShell`, `Panel`, `NodeCard`, `StatusChip`, `PrimaryAction`.

## 12. Design Review Checklist (Before Demo)

- Does the screen look unique without reading any text?
- Can users act from AI responses without typing?
- Is the most important next action obvious in under 3 seconds?
- Are confidence and unresolved questions visible at all times?
- Does mobile preserve the same clarity and control as desktop?

If any answer is "no", revise before polishing animations.
