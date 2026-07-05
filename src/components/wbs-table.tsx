"use client";

import { useState } from "react";
import { isBlockedByDependencies } from "@/lib/dependency-status";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

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

const cellClass = "px-2 py-1.5 text-sm";
const inputClass =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-indigo-400 focus:outline-none";

function phaseProgress(phase: WbsPhase) {
  if (phase.tasks.length === 0) return 0;
  const sum = phase.tasks.reduce((n, t) => n + t.percentComplete, 0);
  return Math.round(sum / phase.tasks.length);
}

export function WbsTable({
  projectId,
  initialPhases,
  members,
  allTasks,
  canEdit,
}: {
  projectId: string;
  initialPhases: WbsPhase[];
  members: Member[];
  allTasks: TaskOption[];
  canEdit: boolean;
}) {
  const [phases, setPhases] = useState(initialPhases);
  const [newTaskName, setNewTaskName] = useState<Record<string, string>>({});
  const [newPhaseName, setNewPhaseName] = useState("");
  const [depErrors, setDepErrors] = useState<Record<string, string>>({});

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
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="w-16 px-2 py-2">WBS</th>
            <th className="px-2 py-2">Task</th>
            <th className="w-36 px-2 py-2">Status</th>
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
            />
          ))}
        </tbody>
      </table>

      {canEdit && (
        <div className="flex items-center gap-2 border-t border-slate-200 p-3">
          <input
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhase()}
            placeholder="New phase name"
            className="w-64 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            onClick={addPhase}
            className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add phase
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseRows({
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
}: {
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
}) {
  const progress = phaseProgress(phase);
  return (
    <>
      <tr className="border-b border-slate-100 bg-slate-50/70">
        <td className={cellClass + " font-mono text-slate-400"}>{phase.wbsCode}</td>
        <td className={cellClass + " font-semibold text-slate-800"} colSpan={5}>
          {phase.name}
        </td>
        <td className={cellClass + " text-slate-500"}>{progress}%</td>
        <td className={cellClass}></td>
        <td className={cellClass}></td>
      </tr>
      {phase.tasks.map((task) => (
        <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
          <td className={cellClass + " font-mono text-xs text-slate-400"}>
            {task.wbsCode}
          </td>
          <td className={cellClass}>
            <input
              defaultValue={task.name}
              disabled={!canEdit}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== task.name) {
                  onUpdateTask(task.id, { name: e.target.value.trim() });
                }
              }}
              className={inputClass}
            />
            {task.isMilestone && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                milestone
              </span>
            )}
            {isBlockedByDependencies(task.dependsOn) && (
              <span
                className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700"
                title="Waiting on an unfinished dependency"
              >
                blocked
              </span>
            )}
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
                      ? "bg-slate-100 text-slate-500"
                      : "bg-amber-50 text-amber-700"
                  }`}
                  title={dep.name}
                >
                  {dep.wbsCode}
                  {canEdit && (
                    <button
                      onClick={() => onRemoveDependency(task.id, dep.dependencyId)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      &times;
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
                  className="rounded border border-dashed border-slate-200 bg-transparent text-[11px] text-slate-400 focus:outline-none"
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
              <p className="mt-0.5 text-[11px] text-red-600">{depErrors[task.id]}</p>
            )}
          </td>
          <td className={cellClass}>
            {canEdit && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-300 hover:text-red-500"
                title="Delete task"
              >
                &times;
              </button>
            )}
          </td>
        </tr>
      ))}
      {canEdit && (
        <tr className="border-b border-slate-100">
          <td className={cellClass}></td>
          <td className={cellClass} colSpan={8}>
            <input
              value={newTaskName}
              onChange={(e) => onNewTaskNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAddTask()}
              placeholder="+ Add task"
              className="w-full rounded border border-dashed border-slate-200 px-2 py-1 text-sm text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
          </td>
        </tr>
      )}
    </>
  );
}
