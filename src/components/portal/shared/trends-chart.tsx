"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Bar,
  BarChart,
} from "recharts";
import { cn } from "@/lib/utils";

export interface TrendSeries {
  /** Unique key matching a key in each TrendPoint. */
  key: string;
  /** Display name in the legend. */
  label: string;
  /** CSS color (hex / hsl / var). Defaults to a rotating palette. */
  color?: string;
}

export interface TrendPoint {
  /** x-axis label (e.g. "Wk 12"). */
  label: string;
  /** One numeric property per series key. */
  [seriesKey: string]: string | number;
}

interface TrendsChartProps {
  data: TrendPoint[];
  series: TrendSeries[];
  height?: number;
  /** "line" (default) or "bar". */
  variant?: "line" | "bar";
  /** Y-axis label. */
  yLabel?: string;
  /** X-axis label. */
  xLabel?: string;
  className?: string;
}

// Cohesive palette that works in both light + dark.
const PALETTE = [
  "hsl(var(--primary))",
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
];

/**
 * Multi-series line or bar chart for visualising trends over time.
 *
 * Used by the Reports → Trends tab to plot weekly journal hours and other
 * time-series data. Built on recharts (already in deps). Themed via CSS
 * variables so it looks correct in light + dark mode.
 */
export function TrendsChart({
  data,
  series,
  height = 320,
  variant = "line",
  yLabel,
  xLabel,
  className,
}: TrendsChartProps) {
  const seriesWithColors = React.useMemo(
    () =>
      series.map((s, i) => ({
        ...s,
        color: s.color ?? PALETTE[i % PALETTE.length],
      })),
    [series],
  );

  if (data.length === 0 || series.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No trend data to display.
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -2,
                      style: {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      },
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                        textAnchor: "middle",
                      },
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelStyle={{
                color: "hsl(var(--popover-foreground))",
                fontWeight: 600,
              }}
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="line"
            />
            {seriesWithColors.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: s.color,
                  stroke: "hsl(var(--background))",
                  strokeWidth: 1.5,
                }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
                connectNulls
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelStyle={{
                color: "hsl(var(--popover-foreground))",
                fontWeight: 600,
              }}
              cursor={{ fill: "hsl(var(--primary))", fillOpacity: 0.08 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="square"
              iconSize={10}
            />
            {seriesWithColors.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default TrendsChart;
