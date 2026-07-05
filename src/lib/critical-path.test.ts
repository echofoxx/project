import { describe, expect, it } from "vitest";
import { computeCriticalPath, type CpmTask } from "@/lib/critical-path";

function d(s: string) {
  return new Date(s);
}

describe("computeCriticalPath", () => {
  it("returns nothing for an empty task list", () => {
    expect(computeCriticalPath([])).toEqual({ results: [], projectEnd: null });
  });

  it("excludes tasks missing planned dates", () => {
    const tasks: CpmTask[] = [
      { id: "A", plannedStart: null, plannedEnd: null, dependsOnTaskIds: [] },
    ];
    expect(computeCriticalPath(tasks).results).toEqual([]);
  });

  it("marks a single task as critical with zero slack", () => {
    const tasks: CpmTask[] = [
      { id: "A", plannedStart: d("2026-01-01"), plannedEnd: d("2026-01-05"), dependsOnTaskIds: [] },
    ];
    const { results, projectEnd } = computeCriticalPath(tasks);
    expect(results).toHaveLength(1);
    expect(results[0].isCritical).toBe(true);
    expect(results[0].slackDays).toBe(0);
    expect(projectEnd).toEqual(d("2026-01-05"));
  });

  it("puts every task on the critical path for a single linear chain", () => {
    const tasks: CpmTask[] = [
      { id: "A", plannedStart: d("2026-01-01"), plannedEnd: d("2026-01-03"), dependsOnTaskIds: [] },
      { id: "B", plannedStart: d("2026-01-03"), plannedEnd: d("2026-01-06"), dependsOnTaskIds: ["A"] },
      { id: "C", plannedStart: d("2026-01-06"), plannedEnd: d("2026-01-10"), dependsOnTaskIds: ["B"] },
    ];
    const { results, projectEnd } = computeCriticalPath(tasks);
    expect(results.every((r) => r.isCritical)).toBe(true);
    expect(projectEnd).toEqual(d("2026-01-10"));
  });

  it("gives the longer branch of a diamond zero slack and the shorter branch positive slack", () => {
    // A -> B (long) -> D
    // A -> C (short) -> D
    const tasks: CpmTask[] = [
      { id: "A", plannedStart: d("2026-01-01"), plannedEnd: d("2026-01-02"), dependsOnTaskIds: [] },
      { id: "B", plannedStart: d("2026-01-02"), plannedEnd: d("2026-01-10"), dependsOnTaskIds: ["A"] },
      { id: "C", plannedStart: d("2026-01-02"), plannedEnd: d("2026-01-04"), dependsOnTaskIds: ["A"] },
      { id: "D", plannedStart: d("2026-01-10"), plannedEnd: d("2026-01-12"), dependsOnTaskIds: ["B", "C"] },
    ];
    const { results } = computeCriticalPath(tasks);
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId.A.isCritical).toBe(true);
    expect(byId.B.isCritical).toBe(true);
    expect(byId.D.isCritical).toBe(true);
    expect(byId.C.isCritical).toBe(false);
    expect(byId.C.slackDays).toBeGreaterThan(0);
  });

  it("pushes a successor's earliest start out when its plan doesn't respect the dependency", () => {
    // B is planned to start before A actually finishes - a real conflict.
    const tasks: CpmTask[] = [
      { id: "A", plannedStart: d("2026-01-01"), plannedEnd: d("2026-01-10"), dependsOnTaskIds: [] },
      { id: "B", plannedStart: d("2026-01-02"), plannedEnd: d("2026-01-05"), dependsOnTaskIds: ["A"] },
    ];
    const { results } = computeCriticalPath(tasks);
    const b = results.find((r) => r.id === "B")!;
    expect(b.earliestStart).toEqual(d("2026-01-10"));
  });
});
