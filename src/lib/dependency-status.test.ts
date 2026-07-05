import { describe, expect, it } from "vitest";
import { isBlockedByDependencies } from "./dependency-status";

describe("isBlockedByDependencies", () => {
  it("is not blocked when there are no dependencies", () => {
    expect(isBlockedByDependencies([])).toBe(false);
  });

  it("is not blocked when all dependencies are Done", () => {
    expect(
      isBlockedByDependencies([{ status: "DONE" }, { status: "DONE" }]),
    ).toBe(false);
  });

  it("is blocked when any dependency is not Done", () => {
    expect(
      isBlockedByDependencies([{ status: "DONE" }, { status: "IN_PROGRESS" }]),
    ).toBe(true);
  });

  it("is blocked when the only dependency is still in Backlog", () => {
    expect(isBlockedByDependencies([{ status: "BACKLOG" }])).toBe(true);
  });
});
