type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type TrackStatus = "done" | "behind" | "in-progress" | "not-started";

export function computeTrackStatus(
  task: { status: TaskStatus; plannedStart: Date | null; plannedEnd: Date | null },
  today: Date,
): TrackStatus {
  if (task.status === "DONE") return "done";
  if (task.plannedEnd && task.plannedEnd < today) return "behind";
  if (task.plannedStart && task.plannedStart <= today) return "in-progress";
  return "not-started";
}
