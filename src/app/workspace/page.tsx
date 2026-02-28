"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useRef, useState } from "react";

import { FlowCanvas } from "@/app/workspace/flow-canvas";
import type { AssistantResponse } from "@/lib/contracts/assistant-response";
import { AssistantResponseSchema } from "@/lib/contracts/assistant-response";
import type { CanvasState } from "@/lib/contracts/canvas-state";
import type { DeploymentStatus } from "@/lib/contracts/deployment-status";
import type { IntentEvent } from "@/lib/contracts/intent-event";
import {
  APPROVER_QUESTION,
  normalizeAddApprovalStepIntent,
  normalizeAnswerApproverIntent,
  normalizeCanvasAddStepIntent,
  normalizeCanvasRenameStepIntent,
  normalizeCanvasRemoveStepIntent,
  normalizeChatIntent,
  normalizeMarkBusinessJustificationRequiredIntent,
  normalizeSetApprovalThresholdIntent,
  normalizeTemplateIntent
} from "@/lib/intent/normalizers";
import { evaluateDeployReadiness } from "@/lib/intent/deploy-readiness";
import { cloneCanvasState, getDefaultCanvasState, WORKSPACE_TEMPLATES } from "@/lib/workspace/templates";

import { Panel, PrimaryAction, StatusChip } from "@/components/primitives";
import { AppShell } from "@/components/shell";
import { cn } from "@/lib/utils/cn";

const sessionId = "workspace-demo-session";
const APPROVER_OPTIONS = ["Finance Lead", "Department Head", "Operations Manager"];

const deploymentStatus: DeploymentStatus = {
  deployment_id: "dep_001",
  status: "queued",
  assets: {
    form_id: null,
    spreadsheet_id: null,
    script_id: null
  },
  error: null,
  progress: {
    current_step: "Auth",
    completed_steps: [],
    failed_step: null
  }
};

function createInitialAssistantResponse(canvasState: CanvasState): AssistantResponse {
  const unresolvedQuestions = [APPROVER_QUESTION];
  const confidence = 0.74;
  const deployReadiness = evaluateDeployReadiness({
    canvas_state: canvasState,
    confidence,
    unresolved_questions: unresolvedQuestions
  });

  return {
    chat_reply: `Refine this workflow using cards, templates, or canvas edits. ${APPROVER_QUESTION}`,
    canvas_state: canvasState,
    canvas_state_patch: [],
    confidence,
    unresolved_questions: unresolvedQuestions,
    next_actions: ["Add approval step", "Mark business justification as required"],
    deploy_ready: deployReadiness.deploy_ready,
    deploy_readiness_reasons: deployReadiness.deploy_readiness_reasons
  };
}

function hasThreshold(canvasState: CanvasState): boolean {
  return canvasState.flow_steps.some((step) => />\s*\d+/.test(step.label));
}

function isBusinessJustificationRequired(canvasState: CanvasState): boolean {
  return canvasState.form_fields.some((field) => field.label === "Business justification" && field.required);
}

const railTabClassName =
  "min-h-11 rounded-control px-2 py-2 text-sm font-semibold text-muted transition-colors duration-hover ease-editorial hover:text-ink data-[state=active]:bg-surface-2 data-[state=active]:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const chipButtonClassName =
  "inline-flex min-h-11 items-center rounded-chip border border-line bg-surface-2 px-3 py-1.5 text-meta font-medium text-ink transition-colors duration-hover ease-editorial hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted";

export default function WorkspacePage() {
  const [canvasState, setCanvasState] = useState<CanvasState>(() => getDefaultCanvasState());
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse>(() =>
    createInitialAssistantResponse(cloneCanvasState(getDefaultCanvasState()))
  );
  const [intentHistory, setIntentHistory] = useState<IntentEvent[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [approverAnswer, setApproverAnswer] = useState(APPROVER_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const canvasStateRef = useRef(canvasState);
  const unresolvedQuestionsRef = useRef(assistantResponse.unresolved_questions);
  const confidenceRef = useRef(assistantResponse.confidence);

  useEffect(() => {
    canvasStateRef.current = canvasState;
  }, [canvasState]);

  useEffect(() => {
    unresolvedQuestionsRef.current = assistantResponse.unresolved_questions;
    confidenceRef.current = assistantResponse.confidence;
  }, [assistantResponse]);

  const unresolvedCount = assistantResponse.unresolved_questions.length;
  const deployBlocked = !assistantResponse.deploy_ready || busy;
  const approvalThresholdEnabled = hasThreshold(canvasState);
  const businessJustificationRequired = isBusinessJustificationRequired(canvasState);
  const deployReadinessReasons = assistantResponse.deploy_readiness_reasons;
  const additionalReadinessReasons = deployReadinessReasons.filter(
    (reason) => !reason.startsWith("Resolve unresolved questions")
  );

  function commitCanvasState(nextCanvasState: CanvasState) {
    setCanvasState(nextCanvasState);
    canvasStateRef.current = nextCanvasState;
  }

  function renameCanvasStep(stepId: string, label: string) {
    const nextLabel = label.trim();
    if (!nextLabel) {
      return;
    }

    const currentCanvasState = canvasStateRef.current;
    const currentStep = currentCanvasState.flow_steps.find((step) => step.id === stepId);
    if (!currentStep || currentStep.label === nextLabel) {
      return;
    }

    const nextCanvasState: CanvasState = {
      ...currentCanvasState,
      flow_steps: currentCanvasState.flow_steps.map((step) =>
        step.id === stepId ? { ...step, label: nextLabel } : step
      )
    };

    commitCanvasState(nextCanvasState);
    void dispatchIntent(normalizeCanvasRenameStepIntent(stepId, nextLabel));
  }

  function removeCanvasStep(stepId: string) {
    void dispatchIntent(normalizeCanvasRemoveStepIntent(stepId));
  }

  async function dispatchIntent(intentEvent: IntentEvent) {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: sessionId,
          intent_event: intentEvent,
          canvas_state: canvasStateRef.current,
          conversation_context: {
            unresolved_questions: unresolvedQuestionsRef.current,
            previous_confidence: confidenceRef.current
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Intent API returned status ${response.status}`);
      }

      const nextAssistant = AssistantResponseSchema.parse(await response.json());
      setAssistantResponse(nextAssistant);
      commitCanvasState(nextAssistant.canvas_state);
      unresolvedQuestionsRef.current = nextAssistant.unresolved_questions;
      confidenceRef.current = nextAssistant.confidence;
      setIntentHistory((previous) => [intentEvent, ...previous].slice(0, 6));
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : "Unable to process interaction.";
      setErrorMessage(fallbackMessage);
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  const topBar = useMemo(
    () => (
      <>
        <div>
          <p className="font-display text-2xl font-bold">Editorial Control Room</p>
          <p className="text-meta text-muted">{canvasState.process_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone="accent">Confidence {Math.round(assistantResponse.confidence * 100)}%</StatusChip>
          <StatusChip tone={unresolvedCount > 0 ? "warning" : "success"}>{unresolvedCount} unresolved</StatusChip>
          <StatusChip tone="neutral">{deploymentStatus.status}</StatusChip>
          <PrimaryAction disabled={deployBlocked} className="hidden lg:inline-flex">
            {deployBlocked ? "Resolve blockers to deploy" : "Deploy to Google Workspace"}
          </PrimaryAction>
        </div>
      </>
    ),
    [assistantResponse.confidence, canvasState.process_name, deployBlocked, unresolvedCount]
  );

  const conversationPanel = (
    <Panel title="Conversation" subtitle="Agentic guidance with actionable controls" variant="elevated">
      <p className="text-sm text-ink">{assistantResponse.chat_reply}</p>
      {assistantResponse.unresolved_questions[0] ? (
        <p className="mt-3 text-meta text-muted">
          Why this question: deployment policy needs an explicit approver for high-value requests.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={chipButtonClassName}
          disabled={busy}
          onClick={() => void dispatchIntent(normalizeAddApprovalStepIntent())}
        >
          Add approval step
        </button>
        <button
          type="button"
          className={chipButtonClassName}
          disabled={busy || businessJustificationRequired}
          onClick={() => void dispatchIntent(normalizeMarkBusinessJustificationRequiredIntent())}
        >
          Mark business justification as required
        </button>
      </div>

      <div className="mt-4 space-y-2 rounded-control border border-line bg-surface p-3">
        <p className="text-meta text-muted">Approval threshold</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Approval threshold">
          <button
            type="button"
            className={cn(chipButtonClassName, approvalThresholdEnabled ? "border-accent text-accent" : undefined)}
            disabled={busy}
            onClick={() => void dispatchIntent(normalizeSetApprovalThresholdIntent(5000))}
          >
            Above 5000
          </button>
          <button
            type="button"
            className={cn(chipButtonClassName, !approvalThresholdEnabled ? "border-accent text-accent" : undefined)}
            disabled={busy}
            onClick={() => void dispatchIntent(normalizeSetApprovalThresholdIntent(null))}
          >
            No threshold
          </button>
        </div>
      </div>

      <form
        className="mt-4 grid gap-2 rounded-control border border-line bg-surface p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!chatMessage.trim()) {
            return;
          }
          const intentEvent = normalizeChatIntent(chatMessage);
          setChatMessage("");
          void dispatchIntent(intentEvent);
        }}
      >
        <label htmlFor="chat-input" className="text-meta text-muted">
          Free-form refinement
        </label>
        <input
          id="chat-input"
          value={chatMessage}
          onChange={(event) => setChatMessage(event.target.value)}
          className="min-h-11 rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          placeholder="Example: approved by Finance Lead"
          disabled={busy}
        />
        <PrimaryAction disabled={busy || !chatMessage.trim()} type="submit" className="w-full sm:w-fit">
          Send chat intent
        </PrimaryAction>
      </form>
    </Panel>
  );

  const questionsPanel = (
    <Panel title="Questions" subtitle="Resolve blockers before deploy" variant="default">
      {assistantResponse.unresolved_questions.length === 0 && deployReadinessReasons.length === 0 ? (
        <p className="text-sm text-ink">No open blockers. You can proceed to deploy.</p>
      ) : (
        <div className="space-y-3">
          {assistantResponse.unresolved_questions.length > 0 ? (
            <ul className="space-y-3">
              {assistantResponse.unresolved_questions.map((question, index) => (
                <li key={`${question}-${index}`} className="rounded-control border border-line bg-surface-2 p-3">
                  <p className="text-sm text-ink">{question}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <label htmlFor={`approver-answer-${index}`} className="sr-only">
                      Select approver
                    </label>
                    <select
                      id={`approver-answer-${index}`}
                      value={approverAnswer}
                      onChange={(event) => setApproverAnswer(event.target.value)}
                      className="min-h-11 rounded-control border border-line bg-surface px-3 text-sm text-ink"
                      disabled={busy}
                    >
                      {APPROVER_OPTIONS.map((approverOption) => (
                        <option key={approverOption} value={approverOption}>
                          {approverOption}
                        </option>
                      ))}
                    </select>
                    <PrimaryAction
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => void dispatchIntent(normalizeAnswerApproverIntent(approverAnswer))}
                    >
                      Answer with control
                    </PrimaryAction>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {additionalReadinessReasons.length > 0 ? (
            <ul className="space-y-2">
              {additionalReadinessReasons.map((reason, index) => (
                <li key={`${reason}-${index}`} className="rounded-control border border-warning bg-surface-2 p-3 text-sm text-ink">
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Panel>
  );

  const templatesPanel = (
    <Panel title="Templates" subtitle="Jump-start with a structured workflow" variant="tinted">
      <ul className="space-y-3">
        {WORKSPACE_TEMPLATES.map((template) => (
          <li key={template.id} className="rounded-control border border-line bg-surface p-3">
            <p className="font-display text-lg font-semibold text-ink">{template.name}</p>
            <p className="mt-1 text-sm text-muted">{template.description}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-meta text-muted">{template.canvas_state.flow_steps.length} workflow steps</p>
              <button
                type="button"
                className={chipButtonClassName}
                disabled={busy}
                onClick={() => void dispatchIntent(normalizeTemplateIntent(template.id))}
              >
                Use template
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );

  const leftRail = (
    <Tabs.Root defaultValue="conversation" className="space-y-3" aria-label="Interaction modes">
      <Tabs.List aria-label="Interaction rail tabs" className="grid grid-cols-3 rounded-control border border-line bg-surface p-1">
        <Tabs.Trigger value="conversation" className={railTabClassName}>
          Conversation
        </Tabs.Trigger>
        <Tabs.Trigger value="questions" className={railTabClassName}>
          Questions
        </Tabs.Trigger>
        <Tabs.Trigger value="templates" className={railTabClassName}>
          Templates
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="conversation" className="outline-none">
        {conversationPanel}
      </Tabs.Content>
      <Tabs.Content value="questions" className="outline-none">
        {questionsPanel}
      </Tabs.Content>
      <Tabs.Content value="templates" className="outline-none">
        {templatesPanel}
      </Tabs.Content>
    </Tabs.Root>
  );

  const rightStage = (
    <div className="space-y-4">
      <Panel title="Canvas" subtitle="Directly edit the workflow graph" variant="elevated">
        <FlowCanvas steps={canvasState.flow_steps} busy={busy} onRenameStep={renameCanvasStep} onRemoveStep={removeCanvasStep} />

        <div className="mt-4">
          <PrimaryAction
            disabled={busy}
            className="w-full sm:w-auto"
            onClick={() => void dispatchIntent(normalizeCanvasAddStepIntent("Review Request"))}
          >
            Add review step
          </PrimaryAction>
        </div>
      </Panel>

      <Panel title="Intent Pipeline" subtitle="Recent normalized events" variant="tinted">
        {intentHistory.length === 0 ? (
          <p className="text-sm text-ink">No events yet. Use any control to emit an intent event.</p>
        ) : (
          <ul className="space-y-2 font-mono text-meta text-ink">
            {intentHistory.map((intentEvent) => (
              <li key={intentEvent.id} className="rounded-control border border-line bg-surface px-3 py-2">
                {intentEvent.source} {"->"} {intentEvent.intent_type}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Form Preview" variant="default">
          <ul className="space-y-2 pl-4 text-sm text-ink">
            {canvasState.form_fields.map((field) => (
              <li key={field.label} className="list-disc">
                {field.label} ({field.type}) {field.required ? "Required" : "Optional"}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sheet Preview" variant="tinted">
          <ul className="space-y-2 pl-4 text-sm text-ink">
            {canvasState.sheet_headers.map((header) => (
              <li key={header} className="list-disc">
                {header}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {errorMessage ? (
        <Panel title="Intent Error" variant="default" className="border-danger">
          <p className="text-sm text-danger">{errorMessage}</p>
        </Panel>
      ) : null}
    </div>
  );

  const mobileDeploy = (
    <Panel title="Deploy" subtitle="Auth -> Form -> Sheet -> Script -> Trigger" variant="tinted">
      <p className="text-sm text-ink">Current step: {deploymentStatus.progress?.current_step}</p>
      <p className="mt-2 text-meta text-muted">
        {deployBlocked ? deployReadinessReasons[0] ?? "Resolve blockers before deployment starts." : "Ready for deployment."}
      </p>
    </Panel>
  );

  return (
    <>
      <AppShell
        topBar={topBar}
        leftRail={leftRail}
        rightStage={rightStage}
        mobilePanels={{
          discuss: leftRail,
          design: rightStage,
          deploy: mobileDeploy
        }}
      />
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3 lg:hidden">
        <PrimaryAction disabled={deployBlocked} className="w-full">
          {deployBlocked ? "Resolve blockers to deploy" : "Deploy to Google Workspace"}
        </PrimaryAction>
      </div>
    </>
  );
}
