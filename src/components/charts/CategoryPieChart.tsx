"use client";

import { useSettings } from "@/hooks/useSettings";
import {
  Cell,
  Pie,
  PieChart,
  PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const GREEN_PALETTE = [
  "#166534",
  "#15803d",
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#86efac",
  "#10b981",
  "#84cc16",
];

const RED_PALETTE = [
  "#7f1d1d",
  "#991b1b",
  "#b91c1c",
  "#dc2626",
  "#ef4444",
  "#f87171",
  "#fca5a5",
  "#fb7185",
];

const RADIAN = Math.PI / 180;

const getDynamicColors = (count: number, palette: "green" | "red") => {
  const base = palette === "green" ? GREEN_PALETTE : RED_PALETTE;

  if (count <= base.length) {
    return base.slice(0, count);
  }

  const colors: string[] = [...base];
  for (let i = base.length; i < count; i += 1) {
    const hue = palette === "green" ? 140 : 8;
    const saturation = 60 + (i % 3) * 10;
    const lightness = 30 + (i % 6) * 8;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }

  return colors;
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: PieLabelRenderProps) => {
  if (
    cx == null ||
    cy == null ||
    innerRadius == null ||
    outerRadius == null ||
    percent == null
  ) {
    return null;
  }

  const inner = Number(innerRadius ?? 0);
  const outer = Number(outerRadius ?? 0);
  const radius = inner + (outer - inner) * 0.5;
  const x = Number(cx) + radius * Math.cos(-(Number(midAngle) || 0) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-(Number(midAngle) || 0) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > Number(cx) ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
};

type CategoryPieChartProps = {
  data: Array<{ name: string; value: number }>;
  emptyMessage: string;
  palette?: "green" | "red";
};

export default function CategoryPieChart({
  data,
  emptyMessage,
  palette = "green",
}: CategoryPieChartProps) {
  const { currency } = useSettings();
  const colors = getDynamicColors(data.length, palette);

  if (!data.length) {
    return <p className="text-center text-muted-foreground">{emptyMessage}</p>;
  }

  const totalValue = data.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={0}
              outerRadius={120}
              paddingAngle={0}
              label={renderCustomizedLabel}
              labelLine={false}
              stroke="transparent"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${Number(value || 0).toLocaleString()} ${currency}`,
                "Amount",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage =
            totalValue > 0 ? (item.value / totalValue) * 100 : 0;

          return (
            <div
              key={`${item.name}-${index}`}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: colors[index % colors.length],
                  }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {Number(item.value || 0).toLocaleString()} {currency}
                </div>
                <div className="text-xs text-muted-foreground">
                  {percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
