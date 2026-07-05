import { describe, expect, it } from "vitest";
import { computeBurnup, type BurnupTask } from "@/lib/burnup";

describe("computeBurnup", () => {
  const tasks: BurnupTask[] = [
    { plannedEnd: new Date("2026-01-05"), actualEnd: new Date("2026-01-06"), status: "DONE" },
    { plannedEnd: new Date("2026-01-10"), actualEnd: null, status: "IN_PROGRESS" },
    { plannedEnd: new Date("2026-01-20"), actualEnd: null, status: "BACKLOG" },
  ];

  it("counts planned-cumulative by plannedEnd regardless of status", () => {
    const { points } = computeBurnup(
      tasks,
      new Date("2026-01-01"),
      new Date("2026-01-20"),
      new Date("2026-01-31"),
      7,
    );
    const last = points[points.length - 1];
    expect(last.plannedCumulative).toBe(3);
  });

  it("counts actual-cumulative only for DONE tasks with actualEnd, up to that date", () => {
    const { points } = computeBurnup(
      tasks,
      new Date("2026-01-01"),
      new Date("2026-01-20"),
      new Date("2026-01-31"),
      7,
    );
    const last = points[points.length - 1];
    expect(last.actualCumulative).toBe(1);
  });

  it("returns null actualCumulative for dates in the future relative to today", () => {
    const { points } = computeBurnup(
      tasks,
      new Date("2026-01-01"),
      new Date("2026-02-01"),
      new Date("2026-01-10"),
      7,
    );
    const future = points.find((p) => p.date > new Date("2026-01-10"));
    expect(future?.actualCumulative).toBeNull();
  });

  it("always includes rangeEnd as the final sampled point", () => {
    const rangeEnd = new Date("2026-01-20");
    const { points } = computeBurnup(tasks, new Date("2026-01-01"), rangeEnd, new Date("2026-01-31"), 7);
    expect(points[points.length - 1].date).toEqual(rangeEnd);
  });

  it("reports the total task count", () => {
    const { total } = computeBurnup(tasks, new Date("2026-01-01"), new Date("2026-01-20"), new Date(), 7);
    expect(total).toBe(3);
  });

  it("counts a task completed earlier today, even though today's sample point is midnight", () => {
    // A task marked done "just now" gets a full timestamp (e.g. 18:03), while
    // sample points are normalized to midnight - the comparison must still
    // treat "done sometime today" as done by today's point.
    const today = new Date("2026-01-15T18:03:00");
    const doneToday: BurnupTask[] = [
      { plannedEnd: new Date("2026-01-10"), actualEnd: today, status: "DONE" },
    ];
    const { points } = computeBurnup(doneToday, new Date("2026-01-01"), new Date("2026-01-15"), today, 7);
    const last = points[points.length - 1];
    expect(last.actualCumulative).toBe(1);
  });
});
