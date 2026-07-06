"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { Diamond, Lock } from "lucide-react";
import { useHighlightTarget } from "@/hooks/use-highlight-target";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

type BoardTask = {
  id: string;
  name: string;
  wbsCode: string;
  status: TaskStatus;
  isMilestone: boolean;
  order: number;
  plannedEnd: string | null;
  assignee: { id: string; name: string; email: string } | null;
  phaseName: string;
  isBlocked: boolean;
};

const COLUMNS: { status: TaskStatus; label: string; accent: string; border: string }[] = [
  { status: "BACKLOG", label: "Backlog", accent: "bg-slate-400", border: "border-l-slate-400" },
  { status: "IN_PROGRESS", label: "In Progress", accent: "bg-blue-500", border: "border-l-blue-500" },
  { status: "REVIEW", label: "Review", accent: "bg-amber-500", border: "border-l-amber-500" },
  { status: "DONE", label: "Done", accent: "bg-emerald-500", border: "border-l-emerald-500" },
];

const BORDER_BY_STATUS: Record<TaskStatus, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.border]),
) as Record<TaskStatus, string>;

function isOverdue(task: BoardTask) {
  if (!task.plannedEnd || task.status === "DONE") return false;
  return new Date(task.plannedEnd) < new Date(new Date().toDateString());
}

function TaskCard({
  task,
  projectId,
  dragging,
}: {
  task: BoardTask;
  projectId?: string;
  dragging?: boolean;
}) {
  const overdue = isOverdue(task);
  return (
    <div
      className={`rounded-md border border-y-slate-200 border-r-slate-200 border-l-4 bg-white p-3 text-sm shadow-sm transition-shadow dark:border-y-slate-800 dark:border-r-slate-800 dark:bg-slate-900 ${
        dragging ? "opacity-70 shadow-lg" : "hover:shadow-md"
      } ${BORDER_BY_STATUS[task.status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        {projectId ? (
          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="min-w-0 break-words font-medium text-slate-800 hover:text-indigo-600 hover:underline dark:text-slate-200 dark:hover:text-indigo-400"
          >
            {task.name}
          </Link>
        ) : (
          <span className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-200">
            {task.name}
          </span>
        )}
        <span className="flex shrink-0 flex-wrap justify-end gap-1">
          {task.isBlocked && (
            <span
              className="flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400"
              title="Waiting on an unfinished dependency"
            >
              <Lock className="h-2.5 w-2.5" />
              blocked
            </span>
          )}
          {task.isMilestone && (
            <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <Diamond className="h-2.5 w-2.5" />
              milestone
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span className="min-w-0 truncate">{task.phaseName}</span>
        <span className="shrink-0">{task.wbsCode}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`min-w-0 truncate text-xs ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}
        >
          {task.plannedEnd
            ? new Date(task.plannedEnd).toLocaleDateString()
            : "No due date"}
        </span>
        {task.assignee && (
          <span
            title={task.assignee.name}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          >
            {task.assignee.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  task,
  projectId,
  highlighted,
}: {
  task: BoardTask;
  projectId: string;
  highlighted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      id={`task-card-${task.id}`}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-md ${isDragging ? "opacity-30" : ""} ${
        highlighted ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900" : ""
      }`}
    >
      <TaskCard task={task} projectId={projectId} />
    </div>
  );
}

function Column({
  status,
  label,
  accent,
  tasks,
  projectId,
  highlightTaskId,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: BoardTask[];
  projectId: string;
  highlightTaskId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={`flex w-[85vw] min-w-0 shrink-0 snap-center flex-col rounded-lg bg-slate-100 p-2 dark:bg-slate-900/60 sm:w-full sm:shrink ${
        isOver ? "ring-2 ring-indigo-400" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 px-1 py-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
        <h3 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h3>
        <span className="ml-auto shrink-0 text-xs text-slate-400 dark:text-slate-500">{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex max-h-[calc(100vh-18rem)] min-h-[6rem] flex-col gap-2 overflow-y-auto p-1"
        >
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              projectId={projectId}
              highlighted={task.id === highlightTaskId}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  projectId,
  initialTasks,
  canEdit,
  highlightTaskId,
}: {
  projectId: string;
  initialTasks: BoardTask[];
  canEdit: boolean;
  highlightTaskId?: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useHighlightTarget(highlightTaskId ? `task-card-${highlightTaskId}` : null);

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, BoardTask[]> = {
      BACKLOG: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function persistStatus(taskId: string, status: TaskStatus) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overStatus = COLUMNS.some((c) => c.status === over.id)
      ? (over.id as TaskStatus)
      : tasks.find((t) => t.id === over.id)?.status;

    if (!overStatus || overStatus === activeTask.status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === activeTask.id ? { ...t, status: overStatus } : t)),
    );
    void persistStatus(activeTask.id, overStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:pb-0 sm:snap-none">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            accent={col.accent}
            tasks={columns[col.status]}
            projectId={projectId}
            highlightTaskId={highlightTaskId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
