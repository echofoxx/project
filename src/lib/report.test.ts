import { describe, expect, it } from "vitest";
import { computeTrackStatus } from "@/lib/report";

const today = new Date("2026-06-15");

describe("computeTrackStatus", () => {
  it("is done when the task status is DONE, even if overdue", () => {
    expect(
      computeTrackStatus(
        { status: "DONE", plannedStart: null, plannedEnd: new Date("2026-01-01") },
        today,
      ),
    ).toBe("done");
  });

  it("is behind when not done and past its planned end", () => {
    expect(
      computeTrackStatus(
        { status: "IN_PROGRESS", plannedStart: null, plannedEnd: new Date("2026-01-01") },
        today,
      ),
    ).toBe("behind");
  });

  it("is in-progress when started on or before today and not overdue", () => {
    expect(
      computeTrackStatus(
        { status: "IN_PROGRESS", plannedStart: new Date("2026-06-01"), plannedEnd: new Date("2026-07-01") },
        today,
      ),
    ).toBe("in-progress");
  });

  it("is not-started when there's no start date in the past", () => {
    expect(
      computeTrackStatus(
        { status: "BACKLOG", plannedStart: new Date("2026-07-01"), plannedEnd: new Date("2026-08-01") },
        today,
      ),
    ).toBe("not-started");
    expect(
      computeTrackStatus({ status: "BACKLOG", plannedStart: null, plannedEnd: null }, today),
    ).toBe("not-started");
  });
});
