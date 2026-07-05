type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

export function isBlockedByDependencies(
  dependsOn: { status: TaskStatus }[],
): boolean {
  return dependsOn.some((dep) => dep.status !== "DONE");
}
