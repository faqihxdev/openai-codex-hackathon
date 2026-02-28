import { describe, expect, test } from "vitest";

import {
  createInMemoryDeploymentsStore,
  createQueuedDeploymentStatus
} from "@/lib/server/deployments/store";

describe("deployments store", () => {
  test("returns created on first insert", () => {
    const store = createInMemoryDeploymentsStore();
    const result = store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-1",
      initial_status: createQueuedDeploymentStatus("dep-1")
    });

    expect(result.kind).toBe("created");
    if (result.kind === "created") {
      expect(result.deployment.deployment_id).toBe("dep-1");
      expect(result.deployment.progress?.current_step).toBe("Auth");
    }
  });

  test("returns replayed for same scope key, idempotency key, and hash", () => {
    const store = createInMemoryDeploymentsStore();
    store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-1",
      initial_status: createQueuedDeploymentStatus("dep-1")
    });

    const replay = store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-1",
      initial_status: createQueuedDeploymentStatus("dep-2")
    });

    expect(replay.kind).toBe("replayed");
    if (replay.kind === "replayed") {
      expect(replay.deployment.deployment_id).toBe("dep-1");
    }
  });

  test("returns conflict for same scope key and idempotency key with different hash", () => {
    const store = createInMemoryDeploymentsStore();
    store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-1",
      initial_status: createQueuedDeploymentStatus("dep-1")
    });

    const conflict = store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-2",
      initial_status: createQueuedDeploymentStatus("dep-2")
    });

    expect(conflict.kind).toBe("conflict");
  });

  test("allows same idempotency key in different scopes", () => {
    const store = createInMemoryDeploymentsStore();

    const first = store.createOrGetDeployment({
      scope_key: "sess-1",
      idempotency_key: "idem-1",
      request_hash: "hash-1",
      initial_status: createQueuedDeploymentStatus("dep-1")
    });
    const second = store.createOrGetDeployment({
      scope_key: "sess-2",
      idempotency_key: "idem-1",
      request_hash: "hash-2",
      initial_status: createQueuedDeploymentStatus("dep-2")
    });

    expect(first.kind).toBe("created");
    expect(second.kind).toBe("created");
  });

  test("advances deployment through steps and populates assets", () => {
    const store = createInMemoryDeploymentsStore();
    store.createOrGetDeployment({
      scope_key: "sess-advance",
      idempotency_key: "idem-advance",
      request_hash: "hash-advance",
      initial_status: createQueuedDeploymentStatus("dep-advance")
    });

    let latest = store.getDeploymentById("dep-advance");
    expect(latest?.status).toBe("queued");

    for (let index = 0; index < 6; index += 1) {
      latest = store.advanceDeployment("dep-advance");
    }

    expect(latest?.status).toBe("succeeded");
    expect(latest?.progress?.completed_steps).toEqual([
      "Auth",
      "Form",
      "Sheet",
      "Script",
      "Trigger"
    ]);
    expect(latest?.assets.form_id).toContain("form-dep-adva");
    expect(latest?.assets.spreadsheet_id).toContain("sheet-dep-adva");
    expect(latest?.assets.script_id).toContain("script-dep-adva");
  });

  test("retry resumes from failed step without clearing completed checkpoint", () => {
    const store = createInMemoryDeploymentsStore();
    store.createOrGetDeployment({
      scope_key: "sess-retry",
      idempotency_key: "idem-fail-once-retry",
      request_hash: "hash-retry",
      initial_status: createQueuedDeploymentStatus("dep-retry")
    });

    for (let index = 0; index < 5; index += 1) {
      store.advanceDeployment("dep-retry");
    }

    const failed = store.getDeploymentById("dep-retry");
    expect(failed?.status).toBe("failed");
    expect(failed?.progress?.failed_step).toBe("Script");
    expect(failed?.progress?.completed_steps).toEqual(["Auth", "Form", "Sheet"]);

    const retried = store.retryDeployment("dep-retry");
    expect(retried.kind).toBe("retried");
    if (retried.kind === "retried") {
      expect(retried.deployment.status).toBe("running");
      expect(retried.deployment.progress?.current_step).toBe("Script");
      expect(retried.deployment.progress?.completed_steps).toEqual([
        "Auth",
        "Form",
        "Sheet"
      ]);
    }

    store.advanceDeployment("dep-retry");
    const succeeded = store.advanceDeployment("dep-retry");
    expect(succeeded?.status).toBe("succeeded");
    expect(succeeded?.progress?.completed_steps).toEqual([
      "Auth",
      "Form",
      "Sheet",
      "Script",
      "Trigger"
    ]);
  });
});
