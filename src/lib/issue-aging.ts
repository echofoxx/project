const DAY_MS = 24 * 60 * 60 * 1000;

export type AgingBucket = "0-2 days" | "3-7 days" | "8-14 days" | "15+ days";

const BUCKETS: { label: AgingBucket; maxDays: number }[] = [
  { label: "0-2 days", maxDays: 2 },
  { label: "3-7 days", maxDays: 7 },
  { label: "8-14 days", maxDays: 14 },
  { label: "15+ days", maxDays: Infinity },
];

export function ageInDays(createdAt: Date, today: Date): number {
  return Math.max(0, Math.floor((today.getTime() - createdAt.getTime()) / DAY_MS));
}

export function bucketForAge(days: number): AgingBucket {
  return BUCKETS.find((b) => days <= b.maxDays)!.label;
}

/**
 * Buckets open issues by how long they've been open. Only meaningful for
 * OPEN issues - resolved issues aren't "aging" anymore.
 */
export function computeIssueAging<T extends { createdAt: Date }>(
  openIssues: T[],
  today: Date,
): Record<AgingBucket, T[]> {
  const result: Record<AgingBucket, T[]> = {
    "0-2 days": [],
    "3-7 days": [],
    "8-14 days": [],
    "15+ days": [],
  };
  for (const issue of openIssues) {
    const bucket = bucketForAge(ageInDays(issue.createdAt, today));
    result[bucket].push(issue);
  }
  return result;
}
