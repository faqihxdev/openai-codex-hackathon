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

  test("saves and retrieves deployment updates", () => {
    const store = createInMemoryDeploymentsStore();
    const deployment = createQueuedDeploymentStatus("dep-1");
    store.saveDeployment({
      ...deployment,
      status: "running"
    });

    const persisted = store.getDeploymentById("dep-1");
    expect(persisted?.status).toBe("running");
  });
});
