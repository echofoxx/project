type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type BurnupTask = {
  plannedEnd: Date | null;
  actualEnd: Date | null;
  status: TaskStatus;
};

export type BurnupPoint = {
  date: Date;
  plannedCumulative: number;
  /** null once the date is in the future - actual completion isn't known yet. */
  actualCumulative: number | null;
};

/**
 * Samples cumulative "planned done" vs "actually done" task counts at a
 * fixed interval across [rangeStart, rangeEnd], approximating a burnup chart
 * from the planned/actual end dates the app already tracks (no separate
 * historical snapshots are stored).
 */
export function computeBurnup(
  tasks: BurnupTask[],
  rangeStart: Date,
  rangeEnd: Date,
  today: Date,
  stepDays = 7,
): { points: BurnupPoint[]; total: number } {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const todayDay = startOfDay(today);

  const dates: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += stepDays * DAY_MS) {
    dates.push(new Date(t));
  }
  dates.push(end);

  const points: BurnupPoint[] = dates.map((date) => {
    const plannedCumulative = tasks.filter(
      (t) => t.plannedEnd && startOfDay(t.plannedEnd) <= date,
    ).length;
    const actualCumulative =
      date > todayDay
        ? null
        : tasks.filter(
            (t) => t.status === "DONE" && t.actualEnd && startOfDay(t.actualEnd) <= date,
          ).length;
    return { date, plannedCumulative, actualCumulative };
  });

  return { points, total: tasks.length };
}
