import { describe, expect, it } from "vitest";
import { ageInDays, bucketForAge, computeIssueAging } from "@/lib/issue-aging";

const today = new Date("2026-01-20");

describe("ageInDays", () => {
  it("computes whole days between createdAt and today", () => {
    expect(ageInDays(new Date("2026-01-15"), today)).toBe(5);
  });

  it("never returns a negative age", () => {
    expect(ageInDays(new Date("2026-01-25"), today)).toBe(0);
  });
});

describe("bucketForAge", () => {
  it("buckets at the documented boundaries", () => {
    expect(bucketForAge(0)).toBe("0-2 days");
    expect(bucketForAge(2)).toBe("0-2 days");
    expect(bucketForAge(3)).toBe("3-7 days");
    expect(bucketForAge(7)).toBe("3-7 days");
    expect(bucketForAge(8)).toBe("8-14 days");
    expect(bucketForAge(14)).toBe("8-14 days");
    expect(bucketForAge(15)).toBe("15+ days");
    expect(bucketForAge(100)).toBe("15+ days");
  });
});

describe("computeIssueAging", () => {
  it("groups issues into their age buckets", () => {
    const issues = [
      { id: "a", createdAt: new Date("2026-01-19") }, // 1 day
      { id: "b", createdAt: new Date("2026-01-10") }, // 10 days
      { id: "c", createdAt: new Date("2025-12-01") }, // 50 days
    ];
    const result = computeIssueAging(issues, today);
    expect(result["0-2 days"].map((i) => i.id)).toEqual(["a"]);
    expect(result["8-14 days"].map((i) => i.id)).toEqual(["b"]);
    expect(result["15+ days"].map((i) => i.id)).toEqual(["c"]);
    expect(result["3-7 days"]).toEqual([]);
  });
});
