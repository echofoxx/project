import { describe, expect, it } from "vitest";
import { wouldReach, type DependencyEdge } from "./dependency-graph";

describe("wouldReach", () => {
  it("returns false when there are no edges", () => {
    expect(wouldReach([], "A", "B")).toBe(false);
  });

  it("returns false for unrelated tasks", () => {
    const edges: DependencyEdge[] = [{ taskId: "B", dependsOnTaskId: "A" }];
    expect(wouldReach(edges, "C", "D")).toBe(false);
  });

  it("detects a direct mutual dependency (A->B, checking B reaches A)", () => {
    // Existing: taskId=B depends on A, i.e. edge A->B (A precedes B).
    const edges: DependencyEdge[] = [{ taskId: "B", dependsOnTaskId: "A" }];
    // Adding "A depends on B" would mean edge B->A. That closes a cycle iff
    // A can already reach B - which it can (A->B directly).
    expect(wouldReach(edges, "A", "B")).toBe(true);
  });

  it("does not falsely flag the reverse direction as a cycle", () => {
    const edges: DependencyEdge[] = [{ taskId: "B", dependsOnTaskId: "A" }];
    // B cannot reach A (there's no B->A edge), so "B depends on A" (again)
    // isn't what's being tested here, but checking B->A reachability should
    // be false since only A->B exists.
    expect(wouldReach(edges, "B", "A")).toBe(false);
  });

  it("detects a transitive cycle across multiple hops", () => {
    // A->B->C->D (each depends on the previous)
    const edges: DependencyEdge[] = [
      { taskId: "B", dependsOnTaskId: "A" },
      { taskId: "C", dependsOnTaskId: "B" },
      { taskId: "D", dependsOnTaskId: "C" },
    ];
    // Adding "A depends on D" (edge D->A) cycles iff A can reach D, which it
    // can via A->B->C->D.
    expect(wouldReach(edges, "A", "D")).toBe(true);
  });

  it("allows a diamond dependency shape (not a cycle)", () => {
    // A precedes B and C; both B and C precede D. D depending on both B and
    // C is a legitimate diamond, not a cycle.
    const edges: DependencyEdge[] = [
      { taskId: "B", dependsOnTaskId: "A" },
      { taskId: "C", dependsOnTaskId: "A" },
      { taskId: "D", dependsOnTaskId: "B" },
    ];
    // Adding "D depends on C" (edge C->D) cycles iff D can already reach C.
    // D has no outgoing edges, so it can't.
    expect(wouldReach(edges, "D", "C")).toBe(false);
  });

  it("ignores edges from unrelated parts of the graph", () => {
    const edges: DependencyEdge[] = [
      { taskId: "B", dependsOnTaskId: "A" },
      { taskId: "Y", dependsOnTaskId: "X" },
    ];
    expect(wouldReach(edges, "A", "X")).toBe(false);
  });

  it("terminates and stays correct when the graph already contains an unrelated cycle", () => {
    const edges: DependencyEdge[] = [
      { taskId: "B", dependsOnTaskId: "A" },
      { taskId: "A", dependsOnTaskId: "B" }, // A<->B cycle, pre-existing/unrelated
      { taskId: "D", dependsOnTaskId: "C" },
    ];
    expect(wouldReach(edges, "C", "D")).toBe(true);
    expect(wouldReach(edges, "C", "A")).toBe(false);
  });
});
