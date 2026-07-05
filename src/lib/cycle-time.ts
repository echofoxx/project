const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export type CycleTimeTask = {
  id: string;
  actualStart: Date | null;
  actualEnd: Date | null;
  owner: string;
  phaseName: string;
};

export type CycleTimeGroup = {
  key: string;
  avgDays: number;
  taskCount: number;
};

/**
 * Cycle time = actualEnd - actualStart, in days, for tasks that have both
 * dates (i.e. work that's at least started). Tasks still in progress or not
 * yet started are excluded rather than guessed at.
 */
export function computeCycleTimes(tasks: CycleTimeTask[]): {
  id: string;
  days: number;
  owner: string;
  phaseName: string;
}[] {
  return tasks
    .filter((t): t is CycleTimeTask & { actualStart: Date; actualEnd: Date } =>
      Boolean(t.actualStart && t.actualEnd),
    )
    .map((t) => ({
      id: t.id,
      days: Math.max(0, daysBetween(t.actualStart, t.actualEnd)),
      owner: t.owner,
      phaseName: t.phaseName,
    }));
}

function groupBy(
  entries: { days: number; key: string }[],
): CycleTimeGroup[] {
  const map = new Map<string, number[]>();
  for (const e of entries) {
    map.set(e.key, [...(map.get(e.key) ?? []), e.days]);
  }
  return Array.from(map.entries())
    .map(([key, days]) => ({
      key,
      avgDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
      taskCount: days.length,
    }))
    .sort((a, b) => b.avgDays - a.avgDays);
}

export function groupCycleTimesByOwner(
  cycleTimes: { days: number; owner: string }[],
): CycleTimeGroup[] {
  return groupBy(cycleTimes.map((c) => ({ days: c.days, key: c.owner })));
}

export function groupCycleTimesByPhase(
  cycleTimes: { days: number; phaseName: string }[],
): CycleTimeGroup[] {
  return groupBy(cycleTimes.map((c) => ({ days: c.days, key: c.phaseName })));
}
