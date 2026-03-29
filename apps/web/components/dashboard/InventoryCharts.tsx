"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyMovement {
  date: string;
  in: number;
  out: number;
  transfer: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
}

// Recharts contentStyle needs real CSS var values — Tailwind v4 stores full
// oklch() inside --chart-* and --color-* tokens, so we reference them directly.
const tooltipStyle: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "0.625rem",
  fontSize: 12,
  padding: "10px 14px",
  boxShadow:
    "0 8px 32px -8px rgba(0,0,0,0.14), 0 2px 8px -2px rgba(0,0,0,0.06)",
  color: "var(--color-card-foreground)",
};

const tooltipLabelStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
  fontWeight: 600,
  marginBottom: 4,
};

const tooltipItemStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const BAR_COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

export function MovementAreaChart({ data }: { data: DailyMovement[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 8, left: -28, bottom: 0 }}
      >
        <defs>
          <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-destructive)"
              stopOpacity={0.28}
            />
            <stop
              offset="100%"
              stopColor="var(--color-destructive)"
              stopOpacity={0}
            />
          </linearGradient>
          <linearGradient id="gradTransfer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="4 4"
          stroke="var(--color-border)"
          vertical={false}
          opacity={0.55}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          dx={-4}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1.5 }}
        />

        <Area
          type="monotone"
          dataKey="in"
          name="Stock In"
          stroke="var(--chart-2)"
          fill="url(#gradIn)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-2)" }}
        />
        <Area
          type="monotone"
          dataKey="out"
          name="Issues"
          stroke="var(--color-destructive)"
          fill="url(#gradOut)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            strokeWidth: 0,
            fill: "var(--color-destructive)",
          }}
        />
        <Area
          type="monotone"
          dataKey="transfer"
          name="Transfers"
          stroke="var(--chart-4)"
          fill="url(#gradTransfer)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-4)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TransactionTypeBarChart({ data }: { data: TypeBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 8, left: -28, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="var(--color-border)"
          vertical={false}
          opacity={0.55}
        />
        <XAxis
          dataKey="type"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          dy={8}
          tickFormatter={(v: string) =>
            v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          }
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          dx={-4}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{
            fill: "var(--color-muted)",
            opacity: 0.4,
            radius: 4,
          }}
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value: number) => [value, "Transactions"]}
        />
        <Bar
          dataKey="count"
          name="Transactions"
          radius={[6, 6, 0, 0]}
          maxBarSize={38}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={BAR_COLORS[index % BAR_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
