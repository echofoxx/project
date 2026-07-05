import type { Prisma } from "@/generated/prisma/client";

/**
 * Returns true if `fromTaskId` can already reach `toTaskId` by following
 * existing "depends on" edges forward (i.e. fromTaskId already, transitively,
 * precedes toTaskId). Used to reject a new dependency that would close a
 * cycle: adding "taskId depends on dependsOnTaskId" creates an edge
 * dependsOnTaskId -> taskId, which cycles iff taskId can already reach
 * dependsOnTaskId.
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

  // dependsOnTaskId precedes taskId, so successors of X are all `taskId`
  // values where dependsOnTaskId === X.
  const successors = new Map<string, string[]>();
  for (const edge of edges) {
    const list = successors.get(edge.dependsOnTaskId) ?? [];
    list.push(edge.taskId);
    successors.set(edge.dependsOnTaskId, list);
  }

  const queue = [fromTaskId];
  const seen = new Set<string>([fromTaskId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toTaskId) return true;
    for (const next of successors.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
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
