import { TrendingUp } from "lucide-react";
import type { BurnupPoint } from "@/lib/burnup";

const WIDTH = 700;
const HEIGHT = 220;
const PAD = { left: 32, right: 16, top: 16, bottom: 28 };
const INNER_WIDTH = WIDTH - PAD.left - PAD.right;
const INNER_HEIGHT = HEIGHT - PAD.top - PAD.bottom;

export function BurnupChart({ points, total }: { points: BurnupPoint[]; total: number }) {
  if (points.length < 2 || total === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
          Burnup
        </div>
        <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500">
          Not enough scheduled tasks yet to chart progress over time.
        </p>
      </div>
    );
  }

  const maxY = Math.max(total, 1);
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * INNER_WIDTH;
  const y = (v: number) => PAD.top + INNER_HEIGHT - (v / maxY) * INNER_HEIGHT;

  const plannedPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.plannedCumulative).toFixed(1)}`)
    .join(" ");

  const actualPoints = points
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.actualCumulative !== null);
  const actualPath = actualPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.actualCumulative!).toFixed(1)}`)
    .join(" ");

  const firstLabel = points[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastLabel = points[points.length - 1].date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
        <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
        Burnup
      </div>
      <div className="flex flex-wrap items-center gap-4 px-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <svg width="16" height="4" className="shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" strokeDasharray="4 3" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={2} />
          </svg>
          Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-indigo-500" />
          Actual
        </span>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Burnup chart">
          {[0, 0.5, 1].map((frac) => (
            <g key={frac}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(maxY * frac)}
                y2={y(maxY * frac)}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(maxY * frac)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-400 text-[10px] dark:fill-slate-500"
              >
                {Math.round(maxY * frac)}
              </text>
            </g>
          ))}
          <path d={plannedPath} fill="none" strokeDasharray="4 3" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth={2} />
          {actualPath && (
            <path d={actualPath} fill="none" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth={2} />
          )}
          <text x={PAD.left} y={HEIGHT - 6} className="fill-slate-400 text-[10px] dark:fill-slate-500">
            {firstLabel}
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-slate-400 text-[10px] dark:fill-slate-500">
            {lastLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}
