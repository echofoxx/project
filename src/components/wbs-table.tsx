"use client";

import { useState } from "react";
import Link from "next/link";
import { Diamond, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { isBlockedByDependencies } from "@/lib/dependency-status";
import { useHighlightTarget } from "@/hooks/use-highlight-target";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Dependency = {
  dependencyId: string;
  taskId: string;
  wbsCode: string;
  name: string;
  status: TaskStatus;
};

type WbsTask = {
  id: string;
  name: string;
  wbsCode: string;
  status: TaskStatus;
  priority: TaskPriority;
  isMilestone: boolean;
  percentComplete: number;
  plannedStart: string;
  plannedEnd: string;
  assigneeId: string | null;
  dependsOn: Dependency[];
};

type WbsPhase = {
  id: string;
  name: string;
  wbsCode: string;
  tasks: WbsTask[];
};

type Member = { id: string; name: string };
type TaskOption = { id: string; wbsCode: string; name: string };

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const cellClass = "px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300";
const inputClass =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-700 hover:border-slate-200 focus:border-indigo-400 focus:outline-none dark:text-slate-300 dark:hover:border-slate-700 dark:[color-scheme:dark]";

function phaseProgress(phase: WbsPhase) {
  if (phase.tasks.length === 0) return 0;
  const sum = phase.tasks.reduce((n, t) => n + t.percentComplete, 0);
  return Math.round(sum / phase.tasks.length);
}

function TaskNameCell({
  projectId,
  task,
  canEdit,
  onRename,
}: {
  projectId: string;
  task: WbsTask;
  canEdit: boolean;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.name);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const trimmed = draft.trim();
          if (trimmed && trimmed !== task.name) onRename(trimmed);
          else setDraft(task.name);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={inputClass}
      />
    );
  }

  return (
    <div className="flex items-start gap-1.5">
      <Link
        href={`/projects/${projectId}/tasks/${task.id}`}
        className="min-w-0 flex-1 whitespace-normal break-words text-slate-700 hover:text-indigo-600 hover:underline dark:text-slate-300 dark:hover:text-indigo-400"
      >
        {task.name}
      </Link>
      <span className="flex shrink-0 flex-wrap items-center gap-1 pt-0.5">
        {task.isMilestone && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <Diamond className="h-2.5 w-2.5" />
            milestone
          </span>
        )}
        {isBlockedByDependencies(task.dependsOn) && (
          <span
            className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-500/15 dark:text-red-400"
            title="Waiting on an unfinished dependency"
          >
            <Lock className="h-2.5 w-2.5" />
            blocked
          </span>
        )}
        {canEdit && (
          <button
            onClick={() => {
              setDraft(task.name);
              setEditing(true);
            }}
            className="text-slate-300 hover:text-indigo-500 dark:text-slate-600"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </span>
    </div>
  );
}

export function WbsTable({
  projectId,
  initialPhases,
  members,
  allTasks,
  canEdit,
  highlightTaskId,
}: {
  projectId: string;
  initialPhases: WbsPhase[];
  members: Member[];
  allTasks: TaskOption[];
  canEdit: boolean;
  highlightTaskId?: string;
}) {
  const [phases, setPhases] = useState(initialPhases);
  const [newTaskName, setNewTaskName] = useState<Record<string, string>>({});
  const [newPhaseName, setNewPhaseName] = useState("");
  const [depErrors, setDepErrors] = useState<Record<string, string>>({});

  useHighlightTarget(highlightTaskId ? `task-row-${highlightTaskId}` : null);

  function patchTaskLocal(taskId: string, patch: Partial<WbsTask>) {
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      })),
    );
  }

  async function updateTask(taskId: string, patch: Record<string, unknown>) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteTask(taskId: string, phaseId: string) {
    if (!confirm("Delete this task?")) return;
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? { ...phase, tasks: phase.tasks.filter((t) => t.id !== taskId) }
          : phase,
      ),
    );
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  }

  async function addTask(phaseId: string) {
    const name = newTaskName[phaseId]?.trim();
    if (!name) return;
    setNewTaskName((prev) => ({ ...prev, [phaseId]: "" }));
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, name }),
    });
    if (!res.ok) return;
    const { task } = await res.json();
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: [
                ...phase.tasks,
                {
                  id: task.id,
                  name: task.name,
                  wbsCode: task.wbsCode,
                  status: task.status,
                  priority: task.priority,
                  isMilestone: task.isMilestone,
                  percentComplete: task.percentComplete,
                  plannedStart: "",
                  plannedEnd: "",
                  assigneeId: null,
                  dependsOn: [],
                },
              ],
            }
          : phase,
      ),
    );
  }

  async function addDependency(taskId: string, dependsOnTaskId: string) {
    setDepErrors((prev) => ({ ...prev, [taskId]: "" }));
    const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOnTaskId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDepErrors((prev) => ({ ...prev, [taskId]: data.error ?? "Could not add dependency." }));
      return;
    }
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                dependsOn: [
                  ...t.dependsOn,
                  {
                    dependencyId: data.dependency.id,
                    taskId: data.dependency.dependsOnTask.id,
                    wbsCode: data.dependency.dependsOnTask.wbsCode,
                    name: data.dependency.dependsOnTask.name,
                    status: data.dependency.dependsOnTask.status,
                  },
                ],
              }
            : t,
        ),
      })),
    );
  }

  async function removeDependency(taskId: string, dependencyId: string) {
    setPhases((prev) =>
      prev.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((t) =>
          t.id === taskId
            ? { ...t, dependsOn: t.dependsOn.filter((d) => d.dependencyId !== dependencyId) }
            : t,
        ),
      })),
    );
    await fetch(`/api/tasks/${taskId}/dependencies/${dependencyId}`, { method: "DELETE" });
  }

  async function addPhase() {
    const name = newPhaseName.trim();
    if (!name) return;
    setNewPhaseName("");
    const res = await fetch(`/api/projects/${projectId}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const { phase } = await res.json();
    setPhases((prev) => [
      ...prev,
      { id: phase.id, name: phase.name, wbsCode: phase.wbsCode, tasks: [] },
    ]);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[1300px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <th className="w-16 px-2 py-2">WBS</th>
            <th className="min-w-[16rem] px-2 py-2">Task</th>
            <th className="w-36 px-2 py-2">Status</th>
            <th className="w-28 px-2 py-2">Priority</th>
            <th className="w-36 px-2 py-2">Owner</th>
            <th className="w-32 px-2 py-2">Start</th>
            <th className="w-32 px-2 py-2">Due</th>
            <th className="w-20 px-2 py-2">%</th>
            <th className="w-48 px-2 py-2">Depends on</th>
            <th className="w-10 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {phases.map((phase) => (
            <PhaseRows
              key={phase.id}
              projectId={projectId}
              phase={phase}
              members={members}
              allTasks={allTasks}
              canEdit={canEdit}
              newTaskName={newTaskName[phase.id] ?? ""}
              onNewTaskNameChange={(v) =>
                setNewTaskName((prev) => ({ ...prev, [phase.id]: v }))
              }
              onAddTask={() => addTask(phase.id)}
              onUpdateTask={(taskId, patch) => {
                patchTaskLocal(taskId, patch as Partial<WbsTask>);
                void updateTask(taskId, patch);
              }}
              onDeleteTask={(taskId) => deleteTask(taskId, phase.id)}
              onAddDependency={addDependency}
              onRemoveDependency={removeDependency}
              depErrors={depErrors}
              highlightTaskId={highlightTaskId}
            />
          ))}
        </tbody>
      </table>

      {canEdit && (
        <div className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhase()}
            placeholder="New phase name"
            className="w-64 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={addPhase}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add phase
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseRows({
  projectId,
  phase,
  members,
  allTasks,
  canEdit,
  newTaskName,
  onNewTaskNameChange,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddDependency,
  onRemoveDependency,
  depErrors,
  highlightTaskId,
}: {
  projectId: string;
  phase: WbsPhase;
  members: Member[];
  allTasks: TaskOption[];
  canEdit: boolean;
  newTaskName: string;
  onNewTaskNameChange: (v: string) => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, patch: Record<string, unknown>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddDependency: (taskId: string, dependsOnTaskId: string) => void;
  onRemoveDependency: (taskId: string, dependencyId: string) => void;
  depErrors: Record<string, string>;
  highlightTaskId?: string;
}) {
  const progress = phaseProgress(phase);
  return (
    <>
      <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
        <td className={cellClass + " font-mono text-slate-400 dark:text-slate-500"}>{phase.wbsCode}</td>
        <td className={cellClass + " font-semibold text-slate-800 dark:text-slate-200"} colSpan={6}>
          {phase.name}
        </td>
        <td className={cellClass + " text-slate-500 dark:text-slate-400"}>{progress}%</td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
      </tr>
      {phase.tasks.map((task) => (
        <tr
          key={task.id}
          id={`task-row-${task.id}`}
          className={`border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40 ${
            task.id === highlightTaskId
              ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300 dark:bg-indigo-500/10 dark:ring-indigo-500/40"
              : ""
          }`}
        >
          <td className={cellClass + " font-mono text-xs text-slate-400 dark:text-slate-500"}>
            {task.wbsCode}
          </td>
          <td className={cellClass + " align-top"}>
            <TaskNameCell
              projectId={projectId}
              task={task}
              canEdit={canEdit}
              onRename={(name) => onUpdateTask(task.id, { name })}
            />
          </td>
          <td className={cellClass}>
            <select
              value={task.status}
              disabled={!canEdit}
              onChange={(e) =>
                onUpdateTask(task.id, { status: e.target.value as TaskStatus })
              }
              className={inputClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </td>
          <td className={cellClass}>
            <select
              value={task.priority}
              disabled={!canEdit}
              onChange={(e) =>
                onUpdateTask(task.id, { priority: e.target.value as TaskPriority })
              }
              className={inputClass}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </td>
          <td className={cellClass}>
            <select
              value={task.assigneeId ?? ""}
              disabled={!canEdit}
              onChange={(e) =>
                onUpdateTask(task.id, { assigneeId: e.target.value || null })
              }
              className={inputClass}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </td>
          <td className={cellClass}>
            <input
              type="date"
              defaultValue={task.plannedStart}
              disabled={!canEdit}
              onChange={(e) => onUpdateTask(task.id, { plannedStart: e.target.value || null })}
              className={inputClass}
            />
          </td>
          <td className={cellClass}>
            <input
              type="date"
              defaultValue={task.plannedEnd}
              disabled={!canEdit}
              onChange={(e) => onUpdateTask(task.id, { plannedEnd: e.target.value || null })}
              className={inputClass}
            />
          </td>
          <td className={cellClass}>
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={task.percentComplete}
              disabled={!canEdit}
              onBlur={(e) =>
                onUpdateTask(task.id, {
                  percentComplete: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              className={inputClass}
            />
          </td>
          <td className={cellClass}>
            <div className="flex flex-wrap items-center gap-1">
              {task.dependsOn.map((dep) => (
                <span
                  key={dep.dependencyId}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                    dep.status === "DONE"
                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}
                  title={dep.name}
                >
                  {dep.wbsCode}
                  {canEdit && (
                    <button
                      onClick={() => onRemoveDependency(task.id, dep.dependencyId)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {canEdit && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onAddDependency(task.id, e.target.value);
                  }}
                  className="rounded border border-dashed border-slate-200 bg-transparent text-[11px] text-slate-400 focus:outline-none dark:border-slate-700 dark:[color-scheme:dark]"
                >
                  <option value="">+ add</option>
                  {allTasks
                    .filter(
                      (t) =>
                        t.id !== task.id &&
                        !task.dependsOn.some((d) => d.taskId === t.id),
                    )
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.wbsCode} {t.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
            {depErrors[task.id] && (
              <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">{depErrors[task.id]}</p>
            )}
          </td>
          <td className={cellClass}>
            {canEdit && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-300 hover:text-red-500 dark:text-slate-600"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </td>
        </tr>
      ))}
      {canEdit && (
        <tr className="border-b border-slate-100 dark:border-slate-800">
          <td className={cellClass}></td>
          <td className={cellClass} colSpan={9}>
            <input
              value={newTaskName}
              onChange={(e) => onNewTaskNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddTask()}
              placeholder="+ Add task"
              className="w-full rounded border border-dashed border-slate-200 px-2 py-1 text-sm text-slate-500 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:text-slate-400"
            />
          </td>
        </tr>
      )}
    </>
  );
}
