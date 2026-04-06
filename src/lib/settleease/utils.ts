
export function formatCurrency(amount: number | string | undefined | null, currencySymbol = '₹') {
  if (amount === undefined || amount === null) {
    return `${currencySymbol}0.00`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    // Handle cases where string parsing might fail, default to 0.00
    return `${currencySymbol}0.00`;
  }
  return `${currencySymbol}${numericAmount.toFixed(2)}`;
}

export function formatCurrencyForAxis(amount: number | string | undefined | null, currencySymbol = '₹') {
  if (amount === undefined || amount === null) {
    return `${currencySymbol}0`;
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    return `${currencySymbol}0`;
  }

  if (Math.abs(numericAmount) >= 1000000) {
    return `${currencySymbol}${(numericAmount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(numericAmount) >= 1000) {
    // For K, typically 0 or 1 decimal place is fine for axis. Let's use 0 for max brevity.
    return `${currencySymbol}${(numericAmount / 1000).toFixed(0)}K`;
  }
  return `${currencySymbol}${numericAmount.toFixed(0)}`; // No decimals for amounts < 1000 on axis
}

export function coerceChartValueToNumber(value: unknown): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const numericValue =
    typeof candidate === 'number'
      ? candidate
      : typeof candidate === 'string'
      ? parseFloat(candidate)
      : Number(candidate);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function coerceChartName(name: unknown): string {
  if (typeof name === 'string') return name;
  if (typeof name === 'number') return String(name);
  return '';
}
