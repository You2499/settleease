export type ChartInspectorRow = {
  label: string;
  value: string;
  color?: string;
};

export type ChartInspectorDatum = {
  title: string;
  rows: ChartInspectorRow[];
  ariaLabel?: string;
};

export type PrimitiveChartPoint = {
  key: string;
  label: string;
  value: number;
  sortValue?: number;
};

export type ChartSeriesDefinition = {
  id: string;
  label: string;
  color?: string;
};

export function getResponsiveChartHeight(width: number, preferred = 360) {
  if (width < 420) return Math.min(preferred, 220);
  if (width < 768) return Math.min(preferred, 250);
  if (width < 1100) return Math.min(preferred, 310);
  return Math.min(preferred, 360);
}

export function shortenAxisLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(maxLength - 3, 1)).trim()}...`;
}

export function buildLineInspectorDatum(
  point: PrimitiveChartPoint,
  valueLabel: string,
  valueFormatter: (value: number) => string,
  color: string
): ChartInspectorDatum {
  const value = valueFormatter(point.value);
  return {
    title: point.label,
    rows: [{ label: valueLabel, value, color }],
    ariaLabel: `${point.label}: ${value}`,
  };
}

export function buildBarInspectorDatum(
  datum: Record<string, number | string>,
  series: ChartSeriesDefinition,
  valueFormatter: (value: number) => string,
  color: string
): ChartInspectorDatum {
  const value = Number(datum[series.id]) || 0;
  const formattedValue = valueFormatter(value);
  const title = String(datum.label);
  return {
    title,
    rows: [{ label: series.label, value: formattedValue, color }],
    ariaLabel: `${title}, ${series.label}: ${formattedValue}`,
  };
}

export function buildStackedInspectorDatum(
  datum: Record<string, number | string>,
  categories: string[],
  colors: string[],
  valueFormatter: (value: number) => string
): ChartInspectorDatum {
  const title = String(datum.label);
  return {
    title,
    rows: categories.map((category, index) => ({
      label: category,
      value: valueFormatter(Number(datum[category]) || 0),
      color: colors[index],
    })),
    ariaLabel: `${title}: ${categories.map((category) => `${category} ${valueFormatter(Number(datum[category]) || 0)}`).join(", ")}`,
  };
}

export function buildDonutInspectorDatum(
  datum: { name: string; amount: number; share?: number },
  valueFormatter: (value: number) => string,
  color: string
): ChartInspectorDatum {
  const rows: ChartInspectorRow[] = [{ label: "Amount", value: valueFormatter(datum.amount), color }];
  if (typeof datum.share === "number") {
    rows.push({ label: "Share", value: `${datum.share.toFixed(1)}%` });
  }

  return {
    title: datum.name,
    rows,
    ariaLabel: `${datum.name}: ${valueFormatter(datum.amount)}`,
  };
}

export function isSinglePointTrend(data: Array<Record<string, number | string>>) {
  return data.length === 1;
}

export function getIntegerAxisDomain(values: number[]): [number, number] {
  const max = Math.max(0, ...values.map((value) => Math.ceil(value)));
  return [0, Math.max(1, max)];
}

export function getIntegerTickValues(max: number, maxTicks = 5) {
  const upper = Math.max(1, Math.ceil(max));
  const step = Math.max(1, Math.ceil(upper / Math.max(maxTicks - 1, 1)));
  const ticks: number[] = [];
  for (let value = 0; value <= upper; value += step) {
    ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== upper) {
    ticks.push(upper);
  }
  return ticks;
}
