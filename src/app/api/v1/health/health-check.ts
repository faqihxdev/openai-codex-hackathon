import {
  type HealthDependency,
  type HealthResponse,
  HealthResponseSchema
} from "@/lib/contracts";

interface DependencyCheck {
  readonly name: string;
  readonly requiredEnv: readonly string[];
}

const HEALTH_SERVICE_NAME = "openai-codex-hackathon";

const DEPENDENCY_CHECKS: readonly DependencyCheck[] = Object.freeze([
  Object.freeze({
    name: "openai",
    requiredEnv: Object.freeze(["OPENAI_API_KEY"])
  }),
  Object.freeze({
    name: "database",
    requiredEnv: Object.freeze(["DATABASE_URL"])
  }),
  Object.freeze({
    name: "nextauth",
    requiredEnv: Object.freeze(["NEXTAUTH_URL", "NEXTAUTH_SECRET"])
  }),
  Object.freeze({
    name: "google_oauth",
    requiredEnv: Object.freeze(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])
  })
]);

function resolveMissingEnv(
  requiredEnv: readonly string[],
  env: NodeJS.ProcessEnv
): string[] {
  return requiredEnv.filter((envKey) => {
    const value = env[envKey];
    return !value || value.trim().length === 0;
  });
}

function evaluateDependency(
  dependencyCheck: DependencyCheck,
  env: NodeJS.ProcessEnv
): HealthDependency {
  const missingEnv = resolveMissingEnv(dependencyCheck.requiredEnv, env);

  return {
    name: dependencyCheck.name,
    status: missingEnv.length === 0 ? "ready" : "degraded",
    required_env: [...dependencyCheck.requiredEnv],
    missing_env: missingEnv
  };
}

export function buildHealthResponse(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date()
): {
  readonly statusCode: 200 | 503;
  readonly payload: HealthResponse;
} {
  const dependencies = DEPENDENCY_CHECKS.map((dependencyCheck) =>
    evaluateDependency(dependencyCheck, env)
  );
  const degradedDependencies = dependencies.filter(
    (dependency) => dependency.status === "degraded"
  ).length;
  const readyDependencies = dependencies.length - degradedDependencies;

  const payload = HealthResponseSchema.parse({
    service: HEALTH_SERVICE_NAME,
    status: degradedDependencies === 0 ? "healthy" : "degraded",
    checked_at_iso: now.toISOString(),
    summary: {
      total_dependencies: dependencies.length,
      ready_dependencies: readyDependencies,
      degraded_dependencies: degradedDependencies
    },
    dependencies
  });

  return {
    statusCode: payload.status === "healthy" ? 200 : 503,
    payload
  };
}
