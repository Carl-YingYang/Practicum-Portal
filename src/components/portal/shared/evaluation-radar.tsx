"use client";

import * as React from "react";
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { RATING_CRITERIA, type Evaluation } from "@/lib/types";
import { averageScore } from "@/lib/selectors";
import { cn } from "@/lib/utils";

interface EvaluationRadarProps {
  evaluation: Evaluation;
  /** Optional comparison evaluation (e.g. previous term) — rendered as a faded second radar. */
  comparison?: Evaluation | null;
  height?: number;
  className?: string;
}

/**
 * Radar/spider chart visualising the criteria scores of an evaluation.
 * Adds a visual shape to the otherwise tabular criteria-score block.
 *
 * If a `comparison` evaluation is supplied, it is plotted as a faded
 * second radar so the viewer can see progress between terms at a glance.
 */
export function EvaluationRadar({
  evaluation,
  comparison,
  height = 260,
  className,
}: EvaluationRadarProps) {
  const data = RATING_CRITERIA.map((c) => ({
    criterion: c.label.split(" ")[0], // short label for axis
    score: evaluation[c.key] ?? 0,
    fullMark: 5,
  }));

  const avg = averageScore(evaluation);

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="78%">
          <PolarGrid
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
            strokeDasharray="2 3"
          />
          <PolarAngleAxis
            dataKey="criterion"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 11,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            domain={[0, 5]}
            tickCount={6}
            tick={false}
            axisLine={false}
          />
          {comparison && (
            <Radar
              dataKey="score"
              data={RATING_CRITERIA.map((c) => ({
                criterion: c.label.split(" ")[0],
                score: comparison[c.key] ?? 0,
                fullMark: 5,
              }))}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.08}
              isAnimationActive
              animationDuration={800}
            />
          )}
          <Radar
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.28}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
            dot={{
              r: 3,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--background))",
              strokeWidth: 1.5,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          />
          This term ({avg.toFixed(1)})
        </span>
        {comparison && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: "hsl(var(--muted-foreground))",
                opacity: 0.5,
              }}
            />
            Previous ({averageScore(comparison).toFixed(1)})
          </span>
        )}
      </div>
    </div>
  );
}

export default EvaluationRadar;
