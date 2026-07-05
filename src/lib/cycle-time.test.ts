import { describe, expect, it } from "vitest";
import {
  computeCycleTimes,
  groupCycleTimesByOwner,
  groupCycleTimesByPhase,
} from "@/lib/cycle-time";

describe("computeCycleTimes", () => {
  it("excludes tasks without both actual dates", () => {
    const result = computeCycleTimes([
      { id: "A", actualStart: null, actualEnd: null, owner: "Alice", phaseName: "Design" },
      {
        id: "B",
        actualStart: new Date("2026-01-01"),
        actualEnd: null,
        owner: "Alice",
        phaseName: "Design",
      },
    ]);
    expect(result).toEqual([]);
  });

  it("computes days between actualStart and actualEnd", () => {
    const result = computeCycleTimes([
      {
        id: "A",
        actualStart: new Date("2026-01-01"),
        actualEnd: new Date("2026-01-05"),
        owner: "Alice",
        phaseName: "Design",
      },
    ]);
    expect(result).toEqual([{ id: "A", days: 4, owner: "Alice", phaseName: "Design" }]);
  });
});

describe("groupCycleTimesByOwner", () => {
  it("averages days per owner and sorts descending", () => {
    const groups = groupCycleTimesByOwner([
      { days: 2, owner: "Alice" },
      { days: 4, owner: "Alice" },
      { days: 10, owner: "Bob" },
    ]);
    expect(groups).toEqual([
      { key: "Bob", avgDays: 10, taskCount: 1 },
      { key: "Alice", avgDays: 3, taskCount: 2 },
    ]);
  });
});

describe("groupCycleTimesByPhase", () => {
  it("averages days per phase", () => {
    const groups = groupCycleTimesByPhase([
      { days: 6, phaseName: "Design" },
      { days: 2, phaseName: "Development" },
    ]);
    expect(groups).toEqual([
      { key: "Design", avgDays: 6, taskCount: 1 },
      { key: "Development", avgDays: 2, taskCount: 1 },
    ]);
  });
});
