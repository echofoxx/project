export type DependencyEdge = { taskId: string; dependsOnTaskId: string };

/**
 * Returns true if `fromTaskId` can already reach `toTaskId` by following
 * existing "depends on" edges forward (i.e. fromTaskId already, transitively,
 * precedes toTaskId).
 *
 * Pure graph algorithm, decoupled from Prisma so it can be unit tested
 * directly. See dependency-cycle.ts for how this is used to reject a new
 * dependency that would close a cycle.
 */
export function wouldReach(
  edges: DependencyEdge[],
  fromTaskId: string,
  toTaskId: string,
): boolean {
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
