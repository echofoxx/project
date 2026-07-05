import { describe, expect, it } from "vitest";
import { parseCsv, toCsv, type CsvRow } from "./csv";

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    wbsCode: "1.1",
    phase: "Planning",
    name: "Do the thing",
    status: "BACKLOG",
    isMilestone: "false",
    assigneeEmail: "",
    plannedStart: "2026-01-01",
    plannedEnd: "2026-01-05",
    percentComplete: "0",
    ...overrides,
  };
}

describe("toCsv / parseCsv round trip", () => {
  it("round-trips a simple row unchanged", () => {
    const rows = [row()];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed).toEqual(rows);
  });

  it("round-trips multiple rows in order", () => {
    const rows = [row({ wbsCode: "1.1" }), row({ wbsCode: "1.2", name: "Second task" })];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed).toEqual(rows);
  });

  it("preserves fields containing commas by quoting them", () => {
    const rows = [row({ name: "Buy nails, screws, and lumber" })];
    const csv = toCsv(rows);
    expect(csv).toContain('"Buy nails, screws, and lumber"');
    expect(parseCsv(csv)).toEqual(rows);
  });

  it("preserves fields containing double quotes", () => {
    const rows = [row({ name: 'Say "hello" to the client' })];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed).toEqual(rows);
  });

  it("preserves fields containing embedded newlines", () => {
    const rows = [row({ name: "Line one\nLine two" })];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed).toEqual(rows);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns an empty array for header-only input", () => {
    const csv = toCsv([]);
    expect(parseCsv(csv)).toEqual([]);
  });

  it("ignores unknown columns and fills missing ones with empty strings", () => {
    const csv = "wbsCode,name,someUnknownColumn\n1.1,Task A,whatever";
    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      {
        wbsCode: "1.1",
        name: "Task A",
        phase: "",
        status: "",
        isMilestone: "",
        assigneeEmail: "",
        plannedStart: "",
        plannedEnd: "",
        percentComplete: "",
      },
    ]);
  });

  it("handles CRLF line endings", () => {
    const csv = toCsv([row({ wbsCode: "1.1" }), row({ wbsCode: "1.2" })]).replace(/\n/g, "\r\n");
    const parsed = parseCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].wbsCode).toBe("1.1");
    expect(parsed[1].wbsCode).toBe("1.2");
  });
});
