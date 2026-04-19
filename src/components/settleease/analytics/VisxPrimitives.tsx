"use client";

import React, { useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from "@visx/scale";
import { Bar, LinePath, Pie } from "@visx/shape";
import { TooltipWithBounds, useTooltip } from "@visx/tooltip";
import { curveMonotoneX } from "@visx/curve";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatAnalyticsCurrency } from "@/lib/settleease/analyticsModel";

type PrimitivePoint = {
  key: string;
  label: string;
  value: number;
  sortValue?: number;
};

type SeriesDefinition = {
  id: string;
  label: string;
  color?: string;
};

type TooltipRow = {
  label: string;
  value: string;
  color?: string;
};

type TooltipDatum = {
  title: string;
  rows: TooltipRow[];
};

type ChartFrameProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

const CHART_COLORS = [
  "#111827",
  "#2f7d68",
  "#c47f2a",
  "#c2415d",
  "#777169",
  "#4b5563",
];

const axisColor = "hsl(var(--muted-foreground))";
const gridColor = "hsl(var(--border))";

export function ChartFrame({ title, description, children, actions, className }: ChartFrameProps) {
  return (
    <Card className={cn("min-w-0 overflow-hidden rounded-lg shadow-lg", className)}>
      <CardHeader className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold leading-tight sm:text-lg">{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-1 text-xs leading-relaxed sm:text-sm">{description}</CardDescription>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-0 sm:px-5">{children}</CardContent>
    </Card>
  );
}

export function ChartLegend({ series }: { series: SeriesDefinition[] }) {
  if (!series.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {series.map((item, index) => (
        <span key={item.id} className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color || CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <span className="truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function ChartTooltip({
  left,
  top,
  title,
  rows,
}: {
  left: number;
  top: number;
  title: string;
  rows: TooltipRow[];
}) {
  return (
    <TooltipWithBounds
      left={left}
      top={top}
      className="z-50 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
      style={{ pointerEvents: "none" }}
    >
      <div className="mb-1 font-medium">{title}</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex min-w-[150px] items-center justify-between gap-4">
            <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
              {row.color ? <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} /> : null}
              <span className="truncate">{row.label}</span>
            </span>
            <span className="font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </TooltipWithBounds>
  );
}

export function ZeroLine({
  y,
  width,
}: {
  y: number;
  width: number;
}) {
  return (
    <line
      x1={0}
      x2={width}
      y1={y}
      y2={y}
      stroke="#94a3b8"
      strokeDasharray="6 5"
      strokeWidth={1.5}
    />
  );
}

function responsiveHeight(width: number, preferred = 360) {
  if (width < 420) return Math.min(preferred, 285);
  if (width < 768) return Math.min(preferred, 320);
  if (width < 1100) return Math.max(330, Math.min(preferred, 380));
  return preferred;
}

function visibleTicks<T>(values: T[], maxTicks: number): T[] {
  if (values.length <= maxTicks) return values;
  const step = Math.ceil(values.length / maxTicks);
  const selected = values.filter((_, index) => index % step === 0);
  const last = values[values.length - 1];
  return selected.includes(last) ? selected : [...selected, last];
}

function paddedDomain(values: number[], includeZero = true): [number, number] {
  const safeValues = values.length ? values : [0];
  const min = includeZero ? Math.min(0, ...safeValues) : Math.min(...safeValues);
  const max = includeZero ? Math.max(0, ...safeValues) : Math.max(...safeValues);
  if (min === max) {
    const padding = Math.max(Math.abs(max) * 0.2, 100);
    return [min - padding, max + padding];
  }
  const range = max - min;
  return [min - range * 0.12, max + range * 0.12];
}

function nearestPoint<T extends { key: string }>(
  data: T[],
  xScale: (key: string) => number | undefined,
  pointerX: number
) {
  return data.reduce<{ point: T | null; distance: number }>(
    (closest, point) => {
      const x = xScale(point.key);
      if (x === undefined) return closest;
      const distance = Math.abs(x - pointerX);
      return distance < closest.distance ? { point, distance } : closest;
    },
    { point: null, distance: Infinity }
  ).point;
}

export function LineChart({
  data,
  valueLabel,
  valueFormatter = formatAnalyticsCurrency,
  color = "#2f7d68",
  height = 360,
  balanceMode = false,
}: {
  data: PrimitivePoint[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  height?: number;
  balanceMode?: boolean;
}) {
  if (!data.length) return <EmptyChart message="No data available for this view." />;

  return (
    <ParentSize>
      {({ width }) => {
        const chartHeight = responsiveHeight(width, height);
        const margin = { top: 18, right: 14, bottom: width < 420 ? 42 : 36, left: width < 420 ? 44 : 62 };
        const xMax = Math.max(width - margin.left - margin.right, 1);
        const yMax = Math.max(chartHeight - margin.top - margin.bottom, 1);
        const yValues = data.map((point) => point.value);
        const xScale = scalePoint<string>({
          domain: data.map((point) => point.key),
          range: [0, xMax],
          padding: 0.4,
        });
        const yScale = scaleLinear<number>({
          domain: paddedDomain(yValues, true),
          range: [yMax, 0],
          nice: true,
        });
        const labelMap = new Map(data.map((point) => [point.key, point.label]));
        const tickValues = visibleTicks(data.map((point) => point.key), width < 420 ? 4 : 6);
        return (
          <InteractiveLineSvg
            data={data}
            width={width}
            height={chartHeight}
            margin={margin}
            xMax={xMax}
            yMax={yMax}
            xScale={xScale}
            yScale={yScale}
            tickValues={tickValues}
            labelMap={labelMap}
            valueLabel={valueLabel}
            valueFormatter={valueFormatter}
            color={color}
            balanceMode={balanceMode}
          />
        );
      }}
    </ParentSize>
  );
}

function InteractiveLineSvg({
  data,
  width,
  height,
  margin,
  xMax,
  yMax,
  xScale,
  yScale,
  tickValues,
  labelMap,
  valueLabel,
  valueFormatter,
  color,
  balanceMode,
}: {
  data: PrimitivePoint[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xMax: number;
  yMax: number;
  xScale: any;
  yScale: any;
  tickValues: string[];
  labelMap: Map<string, string>;
  valueLabel: string;
  valueFormatter: (value: number) => string;
  color: string;
  balanceMode: boolean;
}) {
  const { tooltipData, tooltipLeft = 0, tooltipTop = 0, showTooltip, hideTooltip } = useTooltip<TooltipDatum>();
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const pinnedPoint = pinnedKey ? data.find((point) => point.key === pinnedKey) : null;

  const showPoint = (point: PrimitivePoint) => {
    const left = (xScale(point.key) || 0) + margin.left;
    const top = yScale(point.value) + margin.top;
    showTooltip({
      tooltipLeft: left,
      tooltipTop: top,
      tooltipData: {
        title: point.label,
        rows: [{ label: valueLabel, value: valueFormatter(point.value), color }],
      },
    });
  };

  const handlePointerMove = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    if (pinnedKey) return;
    const point = localPoint(event);
    if (!point) return;
    const nearest = nearestPoint(data, xScale, point.x - margin.left);
    if (nearest) showPoint(nearest);
  };

  const handlePin = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const nearest = nearestPoint(data, xScale, point.x - margin.left);
    if (!nearest) return;
    setPinnedKey((current) => current === nearest.key ? null : nearest.key);
    showPoint(nearest);
  };

  const activePoint = pinnedPoint || (tooltipData ? data.find((point) => point.label === tooltipData.title) : null);

  return (
    <div className="relative min-w-0" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label={`${valueLabel} line chart`}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={xMax} stroke={gridColor} strokeOpacity={0.55} strokeDasharray="3 4" />
          {balanceMode ? <ZeroLine y={yScale(0)} width={xMax} /> : null}
          <AxisLeft
            scale={yScale}
            numTicks={width < 420 ? 4 : 5}
            tickFormat={(value) => valueFormatter(Number(value))}
            stroke={axisColor}
            tickStroke={axisColor}
            tickLabelProps={() => ({
              fill: axisColor,
              fontSize: width < 420 ? 9 : 10,
              textAnchor: "end",
              dy: "0.32em",
            })}
          />
          <AxisBottom
            top={yMax}
            scale={xScale}
            tickValues={tickValues}
            tickFormat={(value) => labelMap.get(String(value)) || String(value)}
            stroke={axisColor}
            tickStroke={axisColor}
            tickLabelProps={() => ({
              fill: axisColor,
              fontSize: width < 420 ? 9 : 10,
              textAnchor: "middle",
              dy: "0.7em",
            })}
          />
          <LinePath
            data={data}
            x={(point) => xScale(point.key) || 0}
            y={(point) => yScale(point.value)}
            stroke={color}
            strokeWidth={2.5}
            curve={curveMonotoneX}
          />
          {data.map((point) => {
            const cx = xScale(point.key) || 0;
            const cy = yScale(point.value);
            const isActive = activePoint?.key === point.key;
            return (
              <circle
                key={point.key}
                cx={cx}
                cy={cy}
                r={isActive ? 4.5 : 3}
                fill="hsl(var(--card))"
                stroke={color}
                strokeWidth={isActive ? 2.5 : 2}
                tabIndex={0}
                role="button"
                aria-label={`${point.label}: ${valueFormatter(point.value)}`}
                onFocus={() => showPoint(point)}
                onBlur={() => {
                  if (!pinnedKey) hideTooltip();
                }}
              />
            );
          })}
          <rect
            width={xMax}
            height={yMax}
            fill="transparent"
            onMouseMove={handlePointerMove}
            onMouseLeave={() => {
              if (!pinnedKey) hideTooltip();
            }}
            onClick={handlePin}
            onTouchStart={handlePin}
          />
        </Group>
      </svg>
      {tooltipData ? (
        <ChartTooltip left={tooltipLeft} top={tooltipTop} title={tooltipData.title} rows={tooltipData.rows} />
      ) : null}
    </div>
  );
}

export function BarChart({
  data,
  series,
  valueFormatter = formatAnalyticsCurrency,
  height = 360,
  horizontal = false,
}: {
  data: Array<Record<string, number | string>>;
  series: SeriesDefinition[];
  valueFormatter?: (value: number) => string;
  height?: number;
  horizontal?: boolean;
}) {
  if (!data.length || !series.length) return <EmptyChart message="No data available for this view." />;

  return (
    <ParentSize>
      {({ width }) => {
        const chartHeight = responsiveHeight(width, height);
        const margin = horizontal
          ? { top: 18, right: 18, bottom: 34, left: width < 420 ? 86 : 120 }
          : { top: 18, right: 14, bottom: width < 420 ? 56 : 42, left: width < 420 ? 44 : 62 };
        const xMax = Math.max(width - margin.left - margin.right, 1);
        const yMax = Math.max(chartHeight - margin.top - margin.bottom, 1);
        return (
          <InteractiveBarSvg
            data={data}
            series={series}
            width={width}
            height={chartHeight}
            margin={margin}
            xMax={xMax}
            yMax={yMax}
            horizontal={horizontal}
            valueFormatter={valueFormatter}
          />
        );
      }}
    </ParentSize>
  );
}

function InteractiveBarSvg({
  data,
  series,
  width,
  height,
  margin,
  xMax,
  yMax,
  horizontal,
  valueFormatter,
}: {
  data: Array<Record<string, number | string>>;
  series: SeriesDefinition[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xMax: number;
  yMax: number;
  horizontal: boolean;
  valueFormatter: (value: number) => string;
}) {
  const { tooltipData, tooltipLeft = 0, tooltipTop = 0, showTooltip, hideTooltip } = useTooltip<TooltipDatum>();
  const colors = series.map((item, index) => item.color || CHART_COLORS[index % CHART_COLORS.length]);
  const colorScale = scaleOrdinal<string, string>({ domain: series.map((item) => item.id), range: colors });
  const keys = data.map((datum) => String(datum.key));
  const labels = new Map(data.map((datum) => [String(datum.key), String(datum.label)]));
  const maxValue = Math.max(0, ...data.flatMap((datum) => series.map((item) => Number(datum[item.id]) || 0)));
  const valueScale = scaleLinear<number>({
    domain: [0, maxValue === 0 ? 100 : maxValue * 1.12],
    range: horizontal ? [0, xMax] : [yMax, 0],
    nice: true,
  });
  const categoryScale = scaleBand<string>({
    domain: keys,
    range: horizontal ? [0, yMax] : [0, xMax],
    padding: 0.22,
  });
  const groupScale = scaleBand<string>({
    domain: series.map((item) => item.id),
    range: [0, categoryScale.bandwidth()],
    padding: 0.12,
  });
  const tickValues = visibleTicks(keys, width < 420 ? 4 : 7);

  const showBarTooltip = (
    datum: Record<string, number | string>,
    item: SeriesDefinition,
    left: number,
    top: number
  ) => {
    const value = Number(datum[item.id]) || 0;
    showTooltip({
      tooltipLeft: left + margin.left,
      tooltipTop: top + margin.top,
      tooltipData: {
        title: String(datum.label),
        rows: [{ label: item.label, value: valueFormatter(value), color: colorScale(item.id) }],
      },
    });
  };

  return (
    <div className="relative min-w-0" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label="Bar chart">
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={horizontal ? scaleLinear({ domain: [0, 1], range: [yMax, 0] }) : valueScale} width={xMax} stroke={gridColor} strokeOpacity={0.55} strokeDasharray="3 4" />
          {horizontal ? (
            <>
              <AxisLeft
                scale={categoryScale}
                tickFormat={(value) => labels.get(String(value)) || String(value)}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "end", dy: "0.32em" })}
              />
              <AxisBottom
                top={yMax}
                scale={valueScale}
                numTicks={width < 420 ? 3 : 5}
                tickFormat={(value) => valueFormatter(Number(value))}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "middle", dy: "0.7em" })}
              />
            </>
          ) : (
            <>
              <AxisLeft
                scale={valueScale}
                numTicks={width < 420 ? 4 : 5}
                tickFormat={(value) => valueFormatter(Number(value))}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "end", dy: "0.32em" })}
              />
              <AxisBottom
                top={yMax}
                scale={categoryScale}
                tickValues={tickValues}
                tickFormat={(value) => labels.get(String(value)) || String(value)}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "middle", dy: "0.7em" })}
              />
            </>
          )}
          {data.map((datum) => {
            const categoryPosition = categoryScale(String(datum.key)) || 0;
            return series.map((item) => {
              const rawValue = Number(datum[item.id]) || 0;
              const groupPosition = groupScale(item.id) || 0;
              const color = colorScale(item.id);
              if (horizontal) {
                const barHeight = Math.max(groupScale.bandwidth(), 3);
                return (
                  <Bar
                    key={`${datum.key}-${item.id}`}
                    x={0}
                    y={categoryPosition + groupPosition}
                    width={valueScale(rawValue)}
                    height={barHeight}
                    fill={color}
                    rx={4}
                    tabIndex={0}
                    role="button"
                    aria-label={`${datum.label}, ${item.label}: ${valueFormatter(rawValue)}`}
                    onFocus={() => showBarTooltip(datum, item, valueScale(rawValue), categoryPosition + groupPosition)}
                    onBlur={hideTooltip}
                    onMouseEnter={() => showBarTooltip(datum, item, valueScale(rawValue), categoryPosition + groupPosition)}
                    onMouseLeave={hideTooltip}
                    onClick={() => showBarTooltip(datum, item, valueScale(rawValue), categoryPosition + groupPosition)}
                    onTouchStart={() => showBarTooltip(datum, item, valueScale(rawValue), categoryPosition + groupPosition)}
                  />
                );
              }

              const barWidth = Math.max(groupScale.bandwidth(), 3);
              const barHeight = yMax - valueScale(rawValue);
              return (
                <Bar
                  key={`${datum.key}-${item.id}`}
                  x={categoryPosition + groupPosition}
                  y={valueScale(rawValue)}
                  width={barWidth}
                  height={Math.max(barHeight, rawValue > 0 ? 2 : 0)}
                  fill={color}
                  rx={4}
                  tabIndex={0}
                  role="button"
                  aria-label={`${datum.label}, ${item.label}: ${valueFormatter(rawValue)}`}
                  onFocus={() => showBarTooltip(datum, item, categoryPosition + groupPosition, valueScale(rawValue))}
                  onBlur={hideTooltip}
                  onMouseEnter={() => showBarTooltip(datum, item, categoryPosition + groupPosition, valueScale(rawValue))}
                  onMouseLeave={hideTooltip}
                  onClick={() => showBarTooltip(datum, item, categoryPosition + groupPosition, valueScale(rawValue))}
                  onTouchStart={() => showBarTooltip(datum, item, categoryPosition + groupPosition, valueScale(rawValue))}
                />
              );
            });
          })}
        </Group>
      </svg>
      {tooltipData ? (
        <ChartTooltip left={tooltipLeft} top={tooltipTop} title={tooltipData.title} rows={tooltipData.rows} />
      ) : null}
      <ChartLegend series={series.map((item, index) => ({ ...item, color: item.color || colors[index] }))} />
    </div>
  );
}

export function Histogram({
  data,
  valueLabel = "Count",
}: {
  data: PrimitivePoint[];
  valueLabel?: string;
}) {
  return (
    <BarChart
      data={data.map((point) => ({ key: point.key, label: point.label, value: point.value }))}
      series={[{ id: "value", label: valueLabel, color: "#2f7d68" }]}
      valueFormatter={(value) => `${value}`}
      height={320}
    />
  );
}

export function StackedAreaChart({
  data,
  categories,
  valueFormatter = formatAnalyticsCurrency,
}: {
  data: Array<Record<string, number | string>>;
  categories: string[];
  valueFormatter?: (value: number) => string;
}) {
  if (!data.length || !categories.length) return <EmptyChart message="No category trend data available." />;

  return (
    <ParentSize>
      {({ width }) => {
        const height = responsiveHeight(width, 360);
        const margin = { top: 18, right: 14, bottom: width < 420 ? 48 : 38, left: width < 420 ? 44 : 62 };
        const xMax = Math.max(width - margin.left - margin.right, 1);
        const yMax = Math.max(height - margin.top - margin.bottom, 1);
        const keys = data.map((datum) => String(datum.key));
        const xScale = scalePoint<string>({ domain: keys, range: [0, xMax], padding: 0.4 });
        const maxStack = Math.max(0, ...data.map((datum) => categories.reduce((sum, category) => sum + (Number(datum[category]) || 0), 0)));
        const yScale = scaleLinear<number>({ domain: [0, maxStack === 0 ? 100 : maxStack * 1.12], range: [yMax, 0], nice: true });
        const labelMap = new Map(data.map((datum) => [String(datum.key), String(datum.label)]));
        const colors = categories.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
        const paths = categories.map((category, categoryIndex) => {
          const topPoints: Array<[number, number]> = [];
          const bottomPoints: Array<[number, number]> = [];
          data.forEach((datum) => {
            const x = xScale(String(datum.key)) || 0;
            const bottom = categories.slice(0, categoryIndex).reduce((sum, key) => sum + (Number(datum[key]) || 0), 0);
            const top = bottom + (Number(datum[category]) || 0);
            topPoints.push([x, yScale(top)]);
            bottomPoints.unshift([x, yScale(bottom)]);
          });
          const points = [...topPoints, ...bottomPoints];
          const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
          return { category, color: colors[categoryIndex], d: `${d} Z` };
        });

        return (
          <div className="relative min-w-0" style={{ height }}>
            <svg width={width} height={height} role="img" aria-label="Stacked area chart">
              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={xMax} stroke={gridColor} strokeOpacity={0.55} strokeDasharray="3 4" />
                <AxisLeft
                  scale={yScale}
                  numTicks={width < 420 ? 4 : 5}
                  tickFormat={(value) => valueFormatter(Number(value))}
                  stroke={axisColor}
                  tickStroke={axisColor}
                  tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "end", dy: "0.32em" })}
                />
                <AxisBottom
                  top={yMax}
                  scale={xScale}
                  tickValues={visibleTicks(keys, width < 420 ? 4 : 6)}
                  tickFormat={(value) => labelMap.get(String(value)) || String(value)}
                  stroke={axisColor}
                  tickStroke={axisColor}
                  tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "middle", dy: "0.7em" })}
                />
                {paths.map((path) => (
                  <path key={path.category} d={path.d} fill={path.color} fillOpacity={0.6} stroke={path.color} strokeWidth={1.5} />
                ))}
              </Group>
            </svg>
            <ChartLegend series={categories.map((category, index) => ({ id: category, label: category, color: colors[index] }))} />
          </div>
        );
      }}
    </ParentSize>
  );
}

export function DonutChart({
  data,
  valueFormatter = formatAnalyticsCurrency,
}: {
  data: Array<{ name: string; amount: number; share?: number }>;
  valueFormatter?: (value: number) => string;
}) {
  if (!data.length) return <EmptyChart message="No breakdown data available." />;

  return (
    <ParentSize>
      {({ width }) => {
        const height = responsiveHeight(width, 320);
        const size = Math.min(width, height);
        const radius = Math.max(Math.min(size / 2 - 20, 125), 84);
        const colors = data.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]);
        return (
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(180px,260px)_1fr] sm:items-center" style={{ minHeight: height }}>
            <svg width={Math.min(width, 300)} height={height} role="img" aria-label="Donut chart">
              <Group top={height / 2} left={Math.min(width, 300) / 2}>
                <Pie
                  data={data}
                  pieValue={(datum) => datum.amount}
                  outerRadius={radius}
                  innerRadius={Math.max(radius - 38, 46)}
                  padAngle={0.018}
                >
                  {(pie) => pie.arcs.map((arc, index) => (
                    <path
                      key={arc.data.name}
                      d={pie.path(arc) || ""}
                      fill={colors[index]}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      <title>{`${arc.data.name}: ${valueFormatter(arc.data.amount)}`}</title>
                    </path>
                  ))}
                </Pie>
              </Group>
            </svg>
            <div className="space-y-2">
              {data.slice(0, 6).map((datum, index) => (
                <div key={datum.name} className="flex items-center justify-between gap-3 rounded-md bg-muted/35 px-3 py-2 text-xs sm:text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[index] }} />
                    <span className="truncate">{datum.name}</span>
                  </span>
                  <span className="shrink-0 font-medium">{valueFormatter(datum.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </ParentSize>
  );
}

export function HeatmapCalendar({
  data,
}: {
  data: Array<{
    dateKey: string;
    label: string;
    sortValue: number;
    transactionCount: number;
    totalAmount: number;
    transactions: Array<{ description: string; amount: number; category: string }>;
  }>;
}) {
  const latest = data.length ? new Date(data[data.length - 1].sortValue) : new Date();
  const [selectedMonth, setSelectedMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const dataMap = useMemo(() => new Map(data.map((day) => [day.dateKey, day])), [data]);
  const maxCount = Math.max(1, ...data.map((day) => day.transactionCount));
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(selectedMonth);
  const days = useMemo(() => {
    const first = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const start = addCalendarDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index));
  }, [selectedMonth]);

  const activeDay = activeKey ? dataMap.get(activeKey) : null;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{monthLabel}</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="flex h-6 items-center justify-center">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = localCalendarKey(day);
          const dayData = dataMap.get(key);
          const ratio = dayData ? dayData.transactionCount / maxCount : 0;
          const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
          const intensity = ratio >= 0.75 ? "bg-primary text-primary-foreground" :
            ratio >= 0.5 ? "bg-primary/70 text-primary-foreground" :
              ratio > 0 ? "bg-primary/35 text-foreground" : "bg-muted/45 text-muted-foreground";
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "flex aspect-square min-h-10 items-center justify-center rounded-md text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                intensity,
                !isCurrentMonth && "opacity-35",
                activeKey === key && "ring-2 ring-ring"
              )}
              onClick={() => setActiveKey((current) => current === key ? null : key)}
              onFocus={() => setActiveKey(key)}
              aria-label={`${formatFullCalendarDate(day)}: ${dayData?.transactionCount || 0} expenses`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[84px] rounded-lg bg-muted/35 p-3 text-xs">
        {activeDay ? (
          <>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium">{activeDay.label}</span>
              <span className="text-muted-foreground">{formatAnalyticsCurrency(activeDay.totalAmount)}</span>
            </div>
            <div className="space-y-1">
              {activeDay.transactions.slice(0, 3).map((transaction, index) => (
                <div key={`${transaction.description}-${index}`} className="flex items-center justify-between gap-3 text-muted-foreground">
                  <span className="truncate">{transaction.description}</span>
                  <span className="shrink-0">{formatAnalyticsCurrency(transaction.amount)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[60px] items-center text-muted-foreground">Tap a day to inspect activity.</div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-lg bg-muted/35 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function addCalendarDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function localCalendarKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFullCalendarDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
