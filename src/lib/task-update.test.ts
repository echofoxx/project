import { describe, expect, it } from "vitest";
import { computeDerivedTaskFields, toDate, type ExistingTaskDates } from "./task-update";

const NOW = new Date("2026-06-15T12:00:00Z");
const notStarted: ExistingTaskDates = { actualStart: null, actualEnd: null };

describe("toDate", () => {
  it("returns undefined for undefined (field not present in request)", () => {
    expect(toDate(undefined)).toBeUndefined();
  });

  it("returns null for null (explicit clear)", () => {
    expect(toDate(null)).toBeNull();
  });

  it("parses a valid ISO date string", () => {
    expect(toDate("2026-01-01")?.getTime()).toBe(new Date("2026-01-01").getTime());
  });

  it("returns null for an unparseable date string", () => {
    expect(toDate("not-a-date")).toBeNull();
  });
});

describe("computeDerivedTaskFields", () => {
  it("stamps actualStart the first time a task leaves Backlog", () => {
    const result = computeDerivedTaskFields(notStarted, { status: "IN_PROGRESS" }, NOW);
    expect(result.actualStart).toEqual(NOW);
    expect(result.actualEnd).toBeUndefined();
  });

  it("does not stamp actualStart when moving to Backlog", () => {
    const result = computeDerivedTaskFields(notStarted, { status: "BACKLOG" }, NOW);
    expect(result.actualStart).toBeUndefined();
  });

  it("does not re-stamp actualStart if it's already set", () => {
    const existing: ExistingTaskDates = { actualStart: new Date("2026-01-01"), actualEnd: null };
    const result = computeDerivedTaskFields(existing, { status: "REVIEW" }, NOW);
    expect(result.actualStart).toBeUndefined();
  });

  it("stamps actualEnd the first time a task reaches Done", () => {
    const existing: ExistingTaskDates = { actualStart: new Date("2026-01-01"), actualEnd: null };
    const result = computeDerivedTaskFields(existing, { status: "DONE" }, NOW);
    expect(result.actualEnd).toEqual(NOW);
  });

  it("also stamps actualStart if a task jumps straight to Done from Backlog", () => {
    const result = computeDerivedTaskFields(notStarted, { status: "DONE" }, NOW);
    expect(result.actualStart).toEqual(NOW);
    expect(result.actualEnd).toEqual(NOW);
  });

  it("does not re-stamp actualEnd if it's already set", () => {
    const existing: ExistingTaskDates = {
      actualStart: new Date("2026-01-01"),
      actualEnd: new Date("2026-01-10"),
    };
    const result = computeDerivedTaskFields(existing, { status: "DONE" }, NOW);
    expect(result.actualEnd).toBeUndefined();
  });

  it("respects an explicit actualStart in the request over auto-inference", () => {
    const explicit = "2026-02-01";
    const result = computeDerivedTaskFields(notStarted, { status: "IN_PROGRESS", actualStart: explicit }, NOW);
    expect(result.actualStart).toEqual(toDate(explicit));
  });

  it("respects an explicit null actualStart (clearing it) even when status changes", () => {
    const existing: ExistingTaskDates = { actualStart: new Date("2026-01-01"), actualEnd: null };
    const result = computeDerivedTaskFields(existing, { status: "IN_PROGRESS", actualStart: null }, NOW);
    expect(result.actualStart).toBeNull();
  });

  it("leaves actual dates untouched when status is not part of the update", () => {
    const result = computeDerivedTaskFields(notStarted, { percentComplete: 50 }, NOW);
    expect(result.actualStart).toBeUndefined();
    expect(result.actualEnd).toBeUndefined();
  });

  it("forces percentComplete to 100 when status becomes Done", () => {
    const result = computeDerivedTaskFields(notStarted, { status: "DONE", percentComplete: 40 }, NOW);
    expect(result.percentComplete).toBe(100);
  });

  it("passes percentComplete through unchanged for non-Done statuses", () => {
    const result = computeDerivedTaskFields(notStarted, { status: "IN_PROGRESS", percentComplete: 40 }, NOW);
    expect(result.percentComplete).toBe(40);
  });
});
