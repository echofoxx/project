import type { Prisma } from "@/generated/prisma/client";
import { wouldReach } from "@/lib/dependency-graph";

/**
 * Returns true if adding "taskId depends on dependsOnTaskId" would create a
 * circular dependency, i.e. taskId can already (transitively) reach
 * dependsOnTaskId via existing edges.
 *
 * Callers must run this inside the same transaction as the eventual
 * `create`, after taking `lockProjectDependencyGraph`, so a concurrent
 * request can't create a cycle by reading the graph before this one commits.
 */
export async function canReach(
  tx: Prisma.TransactionClient,
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
): Promise<boolean> {
  const edges = await tx.taskDependency.findMany({
    where: { task: { projectId } },
    select: { taskId: true, dependsOnTaskId: true },
  });
  return wouldReach(edges, fromTaskId, toTaskId);
}

/**
 * Serializes all dependency-graph mutations for a project behind a
 * transaction-scoped Postgres advisory lock, so concurrent requests can't
 * both pass a cycle check before either has committed its write.
 */
export async function lockProjectDependencyGraph(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`;
}
