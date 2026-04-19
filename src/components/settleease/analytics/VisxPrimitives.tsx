"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { useParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from "@visx/scale";
import { Bar, LinePath, Pie } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatAnalyticsCurrency } from "@/lib/settleease/analyticsModel";
import {
  buildBarInspectorDatum,
  buildDonutInspectorDatum,
  buildLineInspectorDatum,
  buildStackedInspectorDatum,
  type ChartInspectorDatum,
  type ChartInspectorRow,
  type ChartSeriesDefinition,
  getIntegerAxisDomain,
  getIntegerTickValues,
  getResponsiveChartHeight,
  isSinglePointTrend,
  type PrimitiveChartPoint,
  shortenAxisLabel,
} from "./chartHelpers";

type PrimitivePoint = PrimitiveChartPoint;
type SeriesDefinition = ChartSeriesDefinition;
type InspectorDatum = ChartInspectorDatum;
type InspectorRow = ChartInspectorRow;

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
const analyticsGhostButtonClass = "transition-none hover:bg-transparent hover:text-foreground";

export function ChartFrame({ title, description, children, actions, className }: ChartFrameProps) {
  return (
    <Card className={cn("flex min-h-full min-w-0 flex-col overflow-hidden rounded-lg shadow-lg", className)}>
      <CardHeader className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold leading-tight sm:text-lg">{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-1 text-xs leading-relaxed sm:text-sm">{description}</CardDescription>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-3 pb-4 pt-0 sm:px-5">{children}</CardContent>
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

export function ChartInspector({
  datum,
  placeholder = "Inspect the chart to see exact values.",
}: {
  datum: InspectorDatum | null;
  placeholder?: string;
}) {
  return (
    <div
      className="mt-3 h-24 overflow-hidden rounded-lg bg-muted/35 px-3 py-2 text-xs"
      aria-live="polite"
    >
      {datum ? (
        <>
          <div className="truncate font-medium">{datum.title}</div>
          <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {datum.rows.slice(0, 4).map((row) => (
              <InspectorRowItem key={`${row.label}-${row.value}`} row={row} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-full items-center text-muted-foreground">{placeholder}</div>
      )}
    </div>
  );
}

function InspectorRowItem({ row }: { row: InspectorRow }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
        {row.color ? <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} /> : null}
        <span className="truncate">{row.label}</span>
      </span>
      <span className="shrink-0 font-medium">{row.value}</span>
    </div>
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

function MeasuredChart({
  preferredHeight = 360,
  children,
}: {
  preferredHeight?: number;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const { parentRef, width } = useParentSize<HTMLDivElement>({
    initialSize: { width: 360, height: preferredHeight, top: 0, left: 0 },
    debounceTime: 50,
    ignoreDimensions: ["height"],
  });
  const safeWidth = Math.max(width || 360, 1);
  const chartHeight = getResponsiveChartHeight(safeWidth, preferredHeight);

  return (
    <div ref={parentRef} className="relative min-w-0" style={{ minHeight: chartHeight }}>
      {children({ width: safeWidth, height: chartHeight })}
    </div>
  );
}

function useChartInspector(defaultKey: string | null, defaultDatum: InspectorDatum | null) {
  const [activeKey, setActiveKey] = useState<string | null>(defaultKey);
  const [activeDatum, setActiveDatum] = useState<InspectorDatum | null>(defaultDatum);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  useEffect(() => {
    setActiveKey(defaultKey);
    setActiveDatum(defaultDatum);
    setPinnedKey(null);
  }, [defaultKey, defaultDatum]);

  const inspectDatum = (key: string, datum: InspectorDatum) => {
    if (pinnedKey) return;
    setActiveKey(key);
    setActiveDatum(datum);
  };

  const pinDatum = (key: string, datum: InspectorDatum) => {
    setActiveKey(key);
    setActiveDatum(datum);
    setPinnedKey((current) => current === key ? null : key);
  };

  const resetDatum = () => {
    if (pinnedKey) return;
    setActiveKey(defaultKey);
    setActiveDatum(defaultDatum);
  };

  return { activeKey, activeDatum, inspectDatum, pinDatum, resetDatum };
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
  integerAxis = false,
}: {
  data: PrimitivePoint[];
  valueLabel: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  height?: number;
  balanceMode?: boolean;
  integerAxis?: boolean;
}) {
  if (!data.length) return <EmptyChart message="No data available for this view." />;

  return (
    <MeasuredChart preferredHeight={height}>
      {({ width, height: chartHeight }) => {
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
          domain: integerAxis ? getIntegerAxisDomain(yValues) : paddedDomain(yValues, true),
          range: [yMax, 0],
          nice: true,
        });
        const labelMap = new Map(data.map((point) => [point.key, point.label]));
        const tickValues = visibleTicks(data.map((point) => point.key), width < 420 ? 4 : 6);
        const yTickValues = integerAxis ? getIntegerTickValues(Math.max(0, ...yValues), width < 420 ? 4 : 5) : undefined;
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
            yTickValues={yTickValues}
          />
        );
      }}
    </MeasuredChart>
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
  yTickValues,
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
  yTickValues?: number[];
}) {
  const defaultPoint = data[data.length - 1] || null;
  const defaultDatum = useMemo(
    () => defaultPoint ? buildLineInspectorDatum(defaultPoint, valueLabel, valueFormatter, color) : null,
    [color, defaultPoint, valueFormatter, valueLabel]
  );
  const { activeKey, activeDatum, inspectDatum, pinDatum, resetDatum } = useChartInspector(defaultPoint?.key || null, defaultDatum);

  const buildDatum = (point: PrimitivePoint) => buildLineInspectorDatum(point, valueLabel, valueFormatter, color);

  const handlePointerMove = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const nearest = nearestPoint(data, xScale, point.x - margin.left);
    if (nearest) inspectDatum(nearest.key, buildDatum(nearest));
  };

  const handlePin = (event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const nearest = nearestPoint(data, xScale, point.x - margin.left);
    if (!nearest) return;
    pinDatum(nearest.key, buildDatum(nearest));
  };

  return (
    <div className="min-w-0">
      <svg className="block" width={width} height={height} role="img" aria-label={`${valueLabel} line chart`}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={xMax} stroke={gridColor} strokeOpacity={0.55} strokeDasharray="3 4" />
          {balanceMode ? <ZeroLine y={yScale(0)} width={xMax} /> : null}
          <AxisLeft
            scale={yScale}
            numTicks={width < 420 ? 4 : 5}
            tickFormat={(value) => valueFormatter(Number(value))}
            stroke={axisColor}
            tickStroke={axisColor}
            tickValues={yTickValues}
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
            tickFormat={(value) => shortenAxisLabel(labelMap.get(String(value)) || String(value), width < 420 ? 8 : 12)}
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
            const isActive = activeKey === point.key;
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
                onFocus={() => inspectDatum(point.key, buildDatum(point))}
                onBlur={resetDatum}
              />
            );
          })}
          <rect
            width={xMax}
            height={yMax}
            fill="transparent"
            onMouseMove={handlePointerMove}
            onMouseLeave={resetDatum}
            onClick={handlePin}
            onTouchStart={handlePin}
          />
        </Group>
      </svg>
      <ChartInspector datum={activeDatum} />
    </div>
  );
}

export function BarChart({
  data,
  series,
  valueFormatter = formatAnalyticsCurrency,
  height = 360,
  horizontal = false,
  integerAxis = false,
}: {
  data: Array<Record<string, number | string>>;
  series: SeriesDefinition[];
  valueFormatter?: (value: number) => string;
  height?: number;
  horizontal?: boolean;
  integerAxis?: boolean;
}) {
  if (!data.length || !series.length) return <EmptyChart message="No data available for this view." />;

  return (
    <MeasuredChart preferredHeight={height}>
      {({ width, height: chartHeight }) => {
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
            integerAxis={integerAxis}
          />
        );
      }}
    </MeasuredChart>
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
  integerAxis,
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
  integerAxis: boolean;
}) {
  const colors = useMemo(() => series.map((item, index) => item.color || CHART_COLORS[index % CHART_COLORS.length]), [series]);
  const colorScale = useMemo(() => scaleOrdinal<string, string>({ domain: series.map((item) => item.id), range: colors }), [colors, series]);
  const keys = data.map((datum) => String(datum.key));
  const labels = new Map(data.map((datum) => [String(datum.key), String(datum.label)]));
  const maxValue = Math.max(0, ...data.flatMap((datum) => series.map((item) => Number(datum[item.id]) || 0)));
  const valueScale = scaleLinear<number>({
    domain: integerAxis ? getIntegerAxisDomain([maxValue]) : [0, maxValue === 0 ? 100 : maxValue * 1.12],
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
  const valueTickValues = integerAxis ? getIntegerTickValues(maxValue, width < 420 ? 4 : 5) : undefined;
  const defaultBarDatum = data[0] || null;
  const defaultSeries = series[0] || null;
  const defaultKey = defaultBarDatum && defaultSeries ? `${defaultBarDatum.key}-${defaultSeries.id}` : null;
  const defaultDatum = useMemo(() => {
    if (!defaultBarDatum || !defaultSeries) return null;
    return buildBarInspectorDatum(defaultBarDatum, defaultSeries, valueFormatter, colorScale(defaultSeries.id));
  }, [colorScale, defaultBarDatum, defaultSeries, valueFormatter]);
  const { activeKey, activeDatum, inspectDatum, pinDatum, resetDatum } = useChartInspector(defaultKey, defaultDatum);

  const inspectBar = (
    datum: Record<string, number | string>,
    item: SeriesDefinition,
    mode: "hover" | "pin"
  ) => {
    const key = `${datum.key}-${item.id}`;
    const inspectorDatum = buildBarInspectorDatum(datum, item, valueFormatter, colorScale(item.id));
    if (mode === "pin") {
      pinDatum(key, inspectorDatum);
    } else {
      inspectDatum(key, inspectorDatum);
    }
  };

  return (
    <div className="min-w-0">
      <svg className="block" width={width} height={height} role="img" aria-label="Bar chart">
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={horizontal ? scaleLinear({ domain: [0, 1], range: [yMax, 0] }) : valueScale} width={xMax} stroke={gridColor} strokeOpacity={0.55} strokeDasharray="3 4" />
          {horizontal ? (
            <>
              <AxisLeft
                scale={categoryScale}
                tickFormat={(value) => shortenAxisLabel(labels.get(String(value)) || String(value), width < 420 ? 8 : 14)}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "end", dy: "0.32em" })}
              />
              <AxisBottom
                top={yMax}
                scale={valueScale}
                numTicks={width < 420 ? 3 : 5}
                tickValues={valueTickValues}
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
                tickValues={valueTickValues}
                tickFormat={(value) => valueFormatter(Number(value))}
                stroke={axisColor}
                tickStroke={axisColor}
                tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "end", dy: "0.32em" })}
              />
              <AxisBottom
                top={yMax}
                scale={categoryScale}
                tickValues={tickValues}
                tickFormat={(value) => shortenAxisLabel(labels.get(String(value)) || String(value), width < 420 ? 8 : 12)}
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
              const inspectorKey = `${datum.key}-${item.id}`;
              const isActive = activeKey === inspectorKey;
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
                    fillOpacity={isActive ? 1 : 0.88}
                    rx={4}
                    tabIndex={0}
                    role="button"
                    aria-label={`${datum.label}, ${item.label}: ${valueFormatter(rawValue)}`}
                    onFocus={() => inspectBar(datum, item, "hover")}
                    onBlur={resetDatum}
                    onMouseEnter={() => inspectBar(datum, item, "hover")}
                    onMouseLeave={resetDatum}
                    onClick={() => inspectBar(datum, item, "pin")}
                    onTouchStart={() => inspectBar(datum, item, "pin")}
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
                  fillOpacity={isActive ? 1 : 0.88}
                  rx={4}
                  tabIndex={0}
                  role="button"
                  aria-label={`${datum.label}, ${item.label}: ${valueFormatter(rawValue)}`}
                  onFocus={() => inspectBar(datum, item, "hover")}
                  onBlur={resetDatum}
                  onMouseEnter={() => inspectBar(datum, item, "hover")}
                  onMouseLeave={resetDatum}
                  onClick={() => inspectBar(datum, item, "pin")}
                  onTouchStart={() => inspectBar(datum, item, "pin")}
                />
              );
            });
          })}
        </Group>
      </svg>
      <ChartLegend series={series.map((item, index) => ({ ...item, color: item.color || colors[index] }))} />
      <ChartInspector datum={activeDatum} />
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
      integerAxis
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
    <MeasuredChart preferredHeight={360}>
      {({ width, height }) => (
        <InteractiveStackedAreaSvg
          data={data}
          categories={categories}
          valueFormatter={valueFormatter}
          width={width}
          height={height}
        />
      )}
    </MeasuredChart>
  );
}

function InteractiveStackedAreaSvg({
  data,
  categories,
  valueFormatter,
  width,
  height,
}: {
  data: Array<Record<string, number | string>>;
  categories: string[];
  valueFormatter: (value: number) => string;
  width: number;
  height: number;
}) {
  const margin = { top: 18, right: 14, bottom: width < 420 ? 48 : 38, left: width < 420 ? 44 : 62 };
  const xMax = Math.max(width - margin.left - margin.right, 1);
  const yMax = Math.max(height - margin.top - margin.bottom, 1);
  const keys = data.map((datum) => String(datum.key));
  const xScale = scalePoint<string>({ domain: keys, range: [0, xMax], padding: 0.4 });
  const maxStack = Math.max(0, ...data.map((datum) => categories.reduce((sum, category) => sum + (Number(datum[category]) || 0), 0)));
  const yScale = scaleLinear<number>({ domain: [0, maxStack === 0 ? 100 : maxStack * 1.12], range: [yMax, 0], nice: true });
  const labelMap = new Map(data.map((datum) => [String(datum.key), String(datum.label)]));
  const colors = useMemo(() => categories.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]), [categories]);
  const defaultDatumSource = data[data.length - 1] || null;
  const defaultDatum = useMemo(
    () => defaultDatumSource ? buildStackedInspectorDatum(defaultDatumSource, categories, colors, valueFormatter) : null,
    [categories, colors, defaultDatumSource, valueFormatter]
  );
  const { activeKey, activeDatum, inspectDatum, pinDatum, resetDatum } = useChartInspector(defaultDatumSource ? String(defaultDatumSource.key) : null, defaultDatum);
  const legendSeries = categories.map((category, index) => ({ id: category, label: category, color: colors[index] }));

  const inspectPeriod = (datum: Record<string, number | string>, mode: "hover" | "pin") => {
    const key = String(datum.key);
    const inspectorDatum = buildStackedInspectorDatum(datum, categories, colors, valueFormatter);
    if (mode === "pin") {
      pinDatum(key, inspectorDatum);
    } else {
      inspectDatum(key, inspectorDatum);
    }
  };

  if (isSinglePointTrend(data)) {
    const datum = data[0];
    const total = categories.reduce((sum, category) => sum + (Number(datum[category]) || 0), 0);
    const barWidth = Math.min(Math.max(xMax * 0.22, 44), 96);
    const x = xMax / 2 - barWidth / 2;
    let runningTotal = 0;

    return (
      <div className="min-w-0">
        <svg className="block" width={width} height={height} role="img" aria-label="Category trend chart">
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
              tickValues={keys}
              tickFormat={(value) => shortenAxisLabel(labelMap.get(String(value)) || String(value), width < 420 ? 9 : 12)}
              stroke={axisColor}
              tickStroke={axisColor}
              tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "middle", dy: "0.7em" })}
            />
            {categories.map((category, index) => {
              const value = Number(datum[category]) || 0;
              const yTop = yScale(runningTotal + value);
              const yBottom = yScale(runningTotal);
              runningTotal += value;
              return (
                <Bar
                  key={category}
                  x={x}
                  y={yTop}
                  width={barWidth}
                  height={Math.max(yBottom - yTop, value > 0 ? 2 : 0)}
                  fill={colors[index]}
                  fillOpacity={activeKey === String(datum.key) ? 0.9 : 0.72}
                  rx={3}
                  tabIndex={0}
                  role="button"
                  aria-label={`${datum.label}, ${category}: ${valueFormatter(value)}`}
                  onFocus={() => inspectPeriod(datum, "hover")}
                  onBlur={resetDatum}
                  onMouseEnter={() => inspectPeriod(datum, "hover")}
                  onMouseLeave={resetDatum}
                  onClick={() => inspectPeriod(datum, "pin")}
                  onTouchStart={() => inspectPeriod(datum, "pin")}
                />
              );
            })}
            <rect
              x={Math.max(x - 16, 0)}
              y={0}
              width={Math.min(barWidth + 32, xMax)}
              height={yMax}
              fill="transparent"
              onMouseMove={() => inspectPeriod(datum, "hover")}
              onMouseLeave={resetDatum}
              onClick={() => inspectPeriod(datum, "pin")}
              onTouchStart={() => inspectPeriod(datum, "pin")}
            />
            {total === 0 ? <ZeroLine y={yScale(0)} width={xMax} /> : null}
          </Group>
        </svg>
        <ChartLegend series={legendSeries} />
        <ChartInspector datum={activeDatum} />
      </div>
    );
  }

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
    <div className="min-w-0">
      <svg className="block" width={width} height={height} role="img" aria-label="Stacked area chart">
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
            tickFormat={(value) => shortenAxisLabel(labelMap.get(String(value)) || String(value), width < 420 ? 9 : 12)}
            stroke={axisColor}
            tickStroke={axisColor}
            tickLabelProps={() => ({ fill: axisColor, fontSize: width < 420 ? 9 : 10, textAnchor: "middle", dy: "0.7em" })}
          />
          {paths.map((path) => (
            <path key={path.category} d={path.d} fill={path.color} fillOpacity={activeKey ? 0.58 : 0.64} stroke={path.color} strokeWidth={1.5} />
          ))}
          {data.map((datum, index) => {
            const key = String(datum.key);
            const x = xScale(key) || 0;
            const nextX = index < data.length - 1 ? (xScale(String(data[index + 1].key)) || x) : xMax;
            const previousX = index > 0 ? (xScale(String(data[index - 1].key)) || x) : 0;
            const left = index === 0 ? 0 : (previousX + x) / 2;
            const right = index === data.length - 1 ? xMax : (x + nextX) / 2;
            return (
              <rect
                key={key}
                x={left}
                y={0}
                width={Math.max(right - left, 12)}
                height={yMax}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={buildStackedInspectorDatum(datum, categories, colors, valueFormatter).ariaLabel}
                onFocus={() => inspectPeriod(datum, "hover")}
                onBlur={resetDatum}
                onMouseMove={() => inspectPeriod(datum, "hover")}
                onMouseLeave={resetDatum}
                onClick={() => inspectPeriod(datum, "pin")}
                onTouchStart={() => inspectPeriod(datum, "pin")}
              />
            );
          })}
        </Group>
      </svg>
      <ChartLegend series={legendSeries} />
      <ChartInspector datum={activeDatum} />
    </div>
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
    <MeasuredChart preferredHeight={320}>
      {({ width, height }) => (
        <InteractiveDonutChart
          data={data}
          valueFormatter={valueFormatter}
          width={width}
          height={height}
        />
      )}
    </MeasuredChart>
  );
}

function InteractiveDonutChart({
  data,
  valueFormatter,
  width,
  height,
}: {
  data: Array<{ name: string; amount: number; share?: number }>;
  valueFormatter: (value: number) => string;
  width: number;
  height: number;
}) {
  const colors = useMemo(() => data.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]), [data]);
  const defaultSlice = data[0] || null;
  const defaultDatum = useMemo(
    () => defaultSlice ? buildDonutInspectorDatum(defaultSlice, valueFormatter, colors[0]) : null,
    [colors, defaultSlice, valueFormatter]
  );
  const { activeKey, activeDatum, inspectDatum, pinDatum, resetDatum } = useChartInspector(defaultSlice?.name || null, defaultDatum);
  const chartSize = Math.min(width >= 520 ? 220 : width, Math.max(height - 24, 180));
  const radius = Math.max(Math.min(chartSize / 2 - 8, 108), 72);
  const gridColumns = width >= 520 ? "minmax(160px, 220px) minmax(0, 1fr)" : "1fr";

  const inspectSlice = (datum: { name: string; amount: number; share?: number }, index: number, mode: "hover" | "pin") => {
    const inspectorDatum = buildDonutInspectorDatum(datum, valueFormatter, colors[index]);
    if (mode === "pin") {
      pinDatum(datum.name, inspectorDatum);
    } else {
      inspectDatum(datum.name, inspectorDatum);
    }
  };

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 items-center gap-4" style={{ minHeight: height, gridTemplateColumns: gridColumns }}>
        <div className="flex min-w-0 justify-center">
          <svg width={chartSize} height={chartSize} role="img" aria-label="Donut chart">
            <Group top={chartSize / 2} left={chartSize / 2}>
              <Pie
                data={data}
                pieValue={(datum) => datum.amount}
                outerRadius={radius}
                innerRadius={Math.max(radius - 34, 42)}
                padAngle={0.018}
              >
                {(pie) => pie.arcs.map((arc, index) => (
                  <path
                    key={arc.data.name}
                    d={pie.path(arc) || ""}
                    fill={colors[index]}
                    fillOpacity={activeKey === arc.data.name ? 1 : 0.88}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                    tabIndex={0}
                    role="button"
                    aria-label={`${arc.data.name}: ${valueFormatter(arc.data.amount)}`}
                    onFocus={() => inspectSlice(arc.data, index, "hover")}
                    onBlur={resetDatum}
                    onMouseEnter={() => inspectSlice(arc.data, index, "hover")}
                    onMouseLeave={resetDatum}
                    onClick={() => inspectSlice(arc.data, index, "pin")}
                    onTouchStart={() => inspectSlice(arc.data, index, "pin")}
                  />
                ))}
              </Pie>
            </Group>
          </svg>
        </div>
        <div className="grid min-w-0 gap-2">
          {data.slice(0, 6).map((datum, index) => (
            <button
              key={datum.name}
              type="button"
              className={cn(
                "flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md bg-muted/35 px-3 py-2 text-left text-xs transition-none hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm",
                activeKey === datum.name && "ring-1 ring-border"
              )}
              onFocus={() => inspectSlice(datum, index, "hover")}
              onBlur={resetDatum}
              onMouseEnter={() => inspectSlice(datum, index, "hover")}
              onMouseLeave={resetDatum}
              onClick={() => inspectSlice(datum, index, "pin")}
              onTouchStart={() => inspectSlice(datum, index, "pin")}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[index] }} />
                <span className="truncate">{datum.name}</span>
              </span>
              <span className="shrink-0 font-medium">{valueFormatter(datum.amount)}</span>
            </button>
          ))}
        </div>
      </div>
      <ChartInspector datum={activeDatum} />
    </div>
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
          className={cn("h-11 w-11", analyticsGhostButtonClass)}
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
          className={cn("h-11 w-11", analyticsGhostButtonClass)}
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
