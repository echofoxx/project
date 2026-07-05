export type CpmTask = {
  id: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  dependsOnTaskIds: string[];
};

export type CpmResult = {
  id: string;
  earliestStart: Date;
  earliestFinish: Date;
  latestStart: Date;
  latestFinish: Date;
  slackDays: number;
  isCritical: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/**
 * Classic forward/backward-pass critical path method over the task
 * dependency graph, using each task's own planned dates as its earliest
 * possible schedule. A task's computed earliestStart can end up later than
 * its own plannedStart if a dependency's earliest finish pushes it out -
 * that's a real scheduling conflict (mirrors the Timeline's red connector).
 *
 * Tasks missing plannedStart/plannedEnd are excluded (unscheduled work can't
 * be placed on a path) but are ignored gracefully rather than throwing.
 */
export function computeCriticalPath(tasks: CpmTask[]): {
  results: CpmResult[];
  projectEnd: Date | null;
} {
  const scheduled = tasks.filter((t) => t.plannedStart && t.plannedEnd);
  if (scheduled.length === 0) return { results: [], projectEnd: null };

  const byId = new Map(scheduled.map((t) => [t.id, t]));
  const duration = new Map<string, number>();
  for (const t of scheduled) {
    duration.set(t.id, Math.max(0, daysBetween(t.plannedStart!, t.plannedEnd!)));
  }

  // Only consider dependency edges where both ends are in the scheduled set.
  const predecessors = new Map<string, string[]>();
  const successors = new Map<string, string[]>();
  for (const t of scheduled) {
    const preds = t.dependsOnTaskIds.filter((id) => byId.has(id));
    predecessors.set(t.id, preds);
    for (const p of preds) {
      successors.set(p, [...(successors.get(p) ?? []), t.id]);
    }
  }

  // Kahn's algorithm for a topological order; any task caught in a cycle
  // (shouldn't happen - the app rejects cycles - but stay defensive) is
  // simply left out of the ordered list and excluded from the result.
  const inDegree = new Map(scheduled.map((t) => [t.id, predecessors.get(t.id)!.length]));
  const queue = scheduled.filter((t) => inDegree.get(t.id) === 0).map((t) => t.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of successors.get(id) ?? []) {
      const next = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }

  const earliestStart = new Map<string, Date>();
  const earliestFinish = new Map<string, Date>();
  for (const id of order) {
    const task = byId.get(id)!;
    const preds = predecessors.get(id)!;
    const start = preds.reduce(
      (acc, p) => (earliestFinish.get(p)! > acc ? earliestFinish.get(p)! : acc),
      startOfDay(task.plannedStart!),
    );
    earliestStart.set(id, start);
    earliestFinish.set(id, addDays(start, duration.get(id)!));
  }

  const projectEnd = order.reduce<Date | null>((acc, id) => {
    const f = earliestFinish.get(id)!;
    return !acc || f > acc ? f : acc;
  }, null);
  if (!projectEnd) return { results: [], projectEnd: null };

  const latestFinish = new Map<string, Date>();
  const latestStart = new Map<string, Date>();
  for (const id of [...order].reverse()) {
    const succs = successors.get(id) ?? [];
    const finish = succs.reduce(
      (acc, s) => (latestStart.get(s)! < acc ? latestStart.get(s)! : acc),
      projectEnd,
    );
    latestFinish.set(id, finish);
    latestStart.set(id, addDays(finish, -duration.get(id)!));
  }

  const results: CpmResult[] = order.map((id) => {
    const slackDays = daysBetween(earliestStart.get(id)!, latestStart.get(id)!);
    return {
      id,
      earliestStart: earliestStart.get(id)!,
      earliestFinish: earliestFinish.get(id)!,
      latestStart: latestStart.get(id)!,
      latestFinish: latestFinish.get(id)!,
      slackDays,
      isCritical: slackDays <= 0,
    };
  });

  return { results, projectEnd };
}
