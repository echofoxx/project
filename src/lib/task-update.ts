type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type TaskUpdateBody = {
  status?: TaskStatus;
  percentComplete?: number;
  actualStart?: string | null;
  actualEnd?: string | null;
};

export type ExistingTaskDates = {
  actualStart: Date | null;
  actualEnd: Date | null;
};

export function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Derives actualStart/actualEnd/percentComplete for a task PATCH.
 *
 * actualStart is auto-stamped the first time a task leaves Backlog, and
 * actualEnd the first time it reaches Done, so the timeline view gets real
 * planned-vs-actual data without a separate manual date-entry step. An
 * explicit value in the request (including null, to clear) always takes
 * precedence over this inference. Reaching Done also forces
 * percentComplete to 100.
 */
export function computeDerivedTaskFields(
  existing: ExistingTaskDates,
  body: TaskUpdateBody,
  now: Date,
): {
  actualStart: Date | null | undefined;
  actualEnd: Date | null | undefined;
  percentComplete: number | undefined;
} {
  const shouldAutoStart =
    body.actualStart === undefined &&
    body.status !== undefined &&
    body.status !== "BACKLOG" &&
    !existing.actualStart;
  const shouldAutoEnd =
    body.actualEnd === undefined && body.status === "DONE" && !existing.actualEnd;

  return {
    actualStart: shouldAutoStart ? now : toDate(body.actualStart),
    actualEnd: shouldAutoEnd ? now : toDate(body.actualEnd),
    percentComplete: body.status === "DONE" ? 100 : body.percentComplete,
  };
}
