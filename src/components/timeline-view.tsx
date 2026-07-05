"use client";

import { useMemo } from "react";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

type TimelineTask = {
  id: string;
  name: string;
  wbsCode: string;
  status: TaskStatus;
  isMilestone: boolean;
  percentComplete: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  dependsOnTaskIds: string[];
};

type TimelinePhase = {
  id: string;
  name: string;
  wbsCode: string;
  tasks: TimelineTask[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 26;
const LABEL_WIDTH = 280;
const ROW_HEIGHT = 34;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function effectiveRange(task: TimelineTask): { start: Date; end: Date } | null {
  const start = task.actualStart
    ? new Date(task.actualStart)
    : task.plannedStart
      ? new Date(task.plannedStart)
      : null;
  if (!start) return null;
  const end = task.actualEnd
    ? new Date(task.actualEnd)
    : task.plannedEnd
      ? new Date(task.plannedEnd)
      : start;
  return { start, end };
}

export function TimelineView({
  phases,
  projectStart,
  projectEnd,
}: {
  phases: TimelinePhase[];
  projectStart: string | null;
  projectEnd: string | null;
}) {
  const allTasks = phases.flatMap((p) => p.tasks);

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const candidateDates: Date[] = [];
    for (const t of allTasks) {
      for (const value of [t.plannedStart, t.plannedEnd, t.actualStart, t.actualEnd]) {
        if (value) candidateDates.push(new Date(value));
      }
    }
    if (projectStart) candidateDates.push(new Date(projectStart));
    if (projectEnd) candidateDates.push(new Date(projectEnd));
    candidateDates.push(new Date());

    if (candidateDates.length === 0) {
      const today = startOfDay(new Date());
      return { rangeStart: addDays(today, -7), rangeEnd: addDays(today, 30), totalDays: 37 };
    }

    const min = new Date(Math.min(...candidateDates.map((d) => d.getTime())));
    const max = new Date(Math.max(...candidateDates.map((d) => d.getTime())));
    const start = addDays(startOfDay(min), -3);
    const end = addDays(startOfDay(max), 3);
    return { rangeStart: start, rangeEnd: end, totalDays: Math.max(1, daysBetween(start, end)) };
  }, [allTasks, projectStart, projectEnd]);

  const chartWidth = totalDays * PX_PER_DAY;
  const today = startOfDay(new Date());
  const todayOffset = daysBetween(rangeStart, today) * PX_PER_DAY;

  const weekMarkers = useMemo(() => {
    const markers: { offset: number; label: string }[] = [];
    let cursor = rangeStart;
    while (cursor <= rangeEnd) {
      markers.push({ offset: daysBetween(rangeStart, cursor) * PX_PER_DAY, label: formatDate(cursor) });
      cursor = addDays(cursor, 7);
    }
    return markers;
  }, [rangeStart, rangeEnd]);

  // Row index (including phase header rows) for every task, plus its bar's
  // start/end x-offset, so dependency connectors can be drawn between rows.
  const { taskAnchors, bodyRowCount } = useMemo(() => {
    const anchors = new Map<string, { row: number; startX: number; endX: number }>();
    let row = 0;
    for (const phase of phases) {
      row += 1; // phase header row
      for (const task of phase.tasks) {
        const range = effectiveRange(task);
        if (range) {
          anchors.set(task.id, {
            row,
            startX: daysBetween(rangeStart, range.start) * PX_PER_DAY,
            endX: daysBetween(rangeStart, range.end) * PX_PER_DAY,
          });
        }
        row += 1;
      }
    }
    return { taskAnchors: anchors, bodyRowCount: row };
  }, [phases, rangeStart]);

  const connectors = useMemo(() => {
    const paths: { id: string; d: string; conflict: boolean }[] = [];
    for (const phase of phases) {
      for (const task of phase.tasks) {
        const to = taskAnchors.get(task.id);
        if (!to) continue;
        for (const depId of task.dependsOnTaskIds) {
          const from = taskAnchors.get(depId);
          if (!from) continue;
          const fromY = from.row * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toY = to.row * ROW_HEIGHT + ROW_HEIGHT / 2;
          const fromX = from.endX;
          const toX = to.startX;
          const midX = fromX + Math.max(10, (toX - fromX) / 2);
          const d = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
          paths.push({ id: `${depId}-${task.id}`, d, conflict: toX < fromX });
        }
      }
    }
    return paths;
  }, [phases, taskAnchors]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Legend />
      <div className="overflow-x-auto">
        <div style={{ width: LABEL_WIDTH + chartWidth }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-50">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500"
              style={{ width: LABEL_WIDTH }}
            >
              Task
            </div>
            <div className="relative" style={{ width: chartWidth, height: 32 }}>
              {weekMarkers.map((m) => (
                <div
                  key={m.offset}
                  className="absolute top-0 h-full border-l border-slate-200 pl-1 text-xs text-slate-400"
                  style={{ left: m.offset }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {phases.map((phase) => (
              <div key={phase.id}>
                <div className="flex bg-slate-50/70">
                  <div
                    className="sticky left-0 z-10 shrink-0 truncate border-r border-b border-slate-100 bg-slate-50/70 px-3 text-sm font-semibold text-slate-800"
                    style={{ width: LABEL_WIDTH, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
                  >
                    {phase.wbsCode} {phase.name}
                  </div>
                  <div
                    className="relative border-b border-slate-100"
                    style={{ width: chartWidth, height: ROW_HEIGHT }}
                  />
                </div>
                {phase.tasks.map((task) => (
                  <TimelineRow key={task.id} task={task} rangeStart={rangeStart} chartWidth={chartWidth} />
                ))}
              </div>
            ))}

            {/* Dependency connectors, drawn between predecessor and successor bars */}
            <svg
              className="pointer-events-none absolute top-0 z-[5]"
              style={{ left: LABEL_WIDTH }}
              width={chartWidth}
              height={bodyRowCount * ROW_HEIGHT}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-conflict" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="#ef4444" />
                </marker>
              </defs>
              {connectors.map((c) => (
                <path
                  key={c.id}
                  d={c.d}
                  fill="none"
                  stroke={c.conflict ? "#ef4444" : "#94a3b8"}
                  strokeWidth={1.5}
                  markerEnd={c.conflict ? "url(#arrow-conflict)" : "url(#arrow)"}
                />
              ))}
            </svg>

            {/* Today line, spans the full body height */}
            {todayOffset >= 0 && todayOffset <= chartWidth && (
              <div
                className="pointer-events-none absolute top-0 z-10 h-full border-l-2 border-red-400/70"
                style={{ left: LABEL_WIDTH + todayOffset }}
                title="Today"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  task,
  rangeStart,
  chartWidth,
}: {
  task: TimelineTask;
  rangeStart: Date;
  chartWidth: number;
}) {
  const plannedStart = task.plannedStart ? new Date(task.plannedStart) : null;
  const plannedEnd = task.plannedEnd ? new Date(task.plannedEnd) : null;
  const actualStart = task.actualStart ? new Date(task.actualStart) : null;
  const actualEnd = task.actualEnd ? new Date(task.actualEnd) : null;
  const today = startOfDay(new Date());

  function bar(start: Date, end: Date) {
    const left = daysBetween(rangeStart, start) * PX_PER_DAY;
    const width = Math.max(PX_PER_DAY * 0.4, daysBetween(start, end) * PX_PER_DAY);
    return { left, width };
  }

  const plannedBar = plannedStart && plannedEnd ? bar(plannedStart, plannedEnd) : null;

  let actualBar: { left: number; width: number } | null = null;
  let actualColor = "bg-blue-500";
  if (actualStart) {
    const end = actualEnd ?? (task.status === "DONE" ? actualStart : today);
    actualBar = bar(actualStart, end);
    if (task.status === "DONE") {
      actualColor = plannedEnd && actualEnd && actualEnd > plannedEnd ? "bg-amber-500" : "bg-emerald-500";
    } else {
      actualColor = plannedEnd && today > plannedEnd ? "bg-red-500" : "bg-blue-500";
    }
  }

  const milestoneDate = plannedEnd ?? plannedStart;
  const milestoneOffset = milestoneDate ? daysBetween(rangeStart, milestoneDate) * PX_PER_DAY : null;
  const milestoneColor =
    task.status === "DONE"
      ? "bg-emerald-500"
      : milestoneDate && today > milestoneDate
        ? "bg-red-500"
        : "bg-amber-500";

  return (
    <div className="flex hover:bg-slate-50">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-1 truncate border-r border-b border-slate-100 bg-white px-3 text-sm text-slate-700"
        style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
      >
        <span className="shrink-0 font-mono text-xs text-slate-400">{task.wbsCode}</span>
        <span className="truncate">{task.name}</span>
      </div>
      <div
        className="relative border-b border-slate-100"
        style={{ width: chartWidth, height: ROW_HEIGHT }}
      >
        {task.isMilestone ? (
          milestoneOffset !== null && (
            <div
              className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 ${milestoneColor}`}
              style={{ left: milestoneOffset - 6 }}
              title={`${task.name} (milestone)`}
            />
          )
        ) : (
          <>
            {plannedBar && (
              <div
                className="absolute top-1/2 h-3 -translate-y-1/2 rounded border border-slate-300 bg-slate-100"
                style={{ left: plannedBar.left, width: plannedBar.width }}
                title={`Planned: ${plannedStart?.toLocaleDateString()} – ${plannedEnd?.toLocaleDateString()}`}
              />
            )}
            {actualBar && (
              <div
                className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${actualColor}`}
                style={{ left: actualBar.left, width: actualBar.width }}
                title={`Actual: ${actualStart?.toLocaleDateString()} – ${actualEnd ? actualEnd.toLocaleDateString() : "in progress"}`}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { swatch: "border border-slate-300 bg-slate-100", label: "Planned" },
    { swatch: "bg-blue-500", label: "In progress, on track" },
    { swatch: "bg-red-500", label: "Behind schedule" },
    { swatch: "bg-emerald-500", label: "Done on time" },
    { swatch: "bg-amber-500", label: "Done late / upcoming milestone" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-3 py-2 text-xs text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${item.swatch}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
