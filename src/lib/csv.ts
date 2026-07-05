export const CSV_COLUMNS = [
  "wbsCode",
  "phase",
  "name",
  "status",
  "isMilestone",
  "assigneeEmail",
  "plannedStart",
  "plannedEnd",
  "percentComplete",
] as const;

export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: CsvRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((col) => escapeCsvField(row[col] ?? "")).join(","),
  );
  return [header, ...lines].join("\n");
}

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((r) => r.length > 1 || r[0] !== "");
  if (!header) return [];

  return dataRows.map((cols) => {
    const record: Partial<CsvRow> = {};
    header.forEach((col, idx) => {
      if ((CSV_COLUMNS as readonly string[]).includes(col)) {
        record[col as (typeof CSV_COLUMNS)[number]] = cols[idx] ?? "";
      }
    });
    return record as CsvRow;
  });
}
