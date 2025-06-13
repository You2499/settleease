
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
