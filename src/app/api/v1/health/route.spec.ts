import { describe, expect, it } from "vitest";

import { HealthResponseSchema } from "@/lib/contracts";

import { buildHealthResponse } from "./health-check";
import { GET } from "./route";

const COMPLETE_ENV: NodeJS.ProcessEnv = {
  OPENAI_API_KEY: "openai-key",
  DATABASE_URL: "postgres://example",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "nextauth-secret",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret"
};

describe("GET /api/v1/health", () => {
  it("returns healthy status when all dependencies are ready", () => {
    const { statusCode, payload } = buildHealthResponse(
      COMPLETE_ENV,
      new Date("2026-02-28T12:00:00.000Z")
    );

    expect(statusCode).toBe(200);
    const parsed = HealthResponseSchema.parse(payload);
    expect(parsed.status).toBe("healthy");
    expect(parsed.summary.degraded_dependencies).toBe(0);
    expect(parsed.dependencies.every((dependency) => dependency.status === "ready")).toBe(true);
  });

  it("returns degraded status and missing env details when any dependency is not ready", () => {
    const { statusCode, payload } = buildHealthResponse(
      {
        ...COMPLETE_ENV,
        DATABASE_URL: ""
      },
      new Date("2026-02-28T12:00:00.000Z")
    );

    expect(statusCode).toBe(503);
    const parsed = HealthResponseSchema.parse(payload);
    expect(parsed.status).toBe("degraded");
    expect(parsed.summary.degraded_dependencies).toBeGreaterThan(0);

    const databaseCheck = parsed.dependencies.find(
      (dependency) => dependency.name === "database"
    );
    expect(databaseCheck?.status).toBe("degraded");
    expect(databaseCheck?.missing_env).toContain("DATABASE_URL");
  });

  it("returns a schema-valid payload from the route handler", async () => {
    const response = await GET();

    expect([200, 503]).toContain(response.status);

    const payload = HealthResponseSchema.parse(await response.json());
    expect(payload.dependencies.length).toBeGreaterThan(0);
  });
});
