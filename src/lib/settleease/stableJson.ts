export function sortObjectKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  Object.keys(value as Record<string, unknown>)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
    });

  return sorted;
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}
