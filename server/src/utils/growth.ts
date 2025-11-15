export function parseMaturityDays(spec: string | number | null | undefined): number | null {
  if (spec == null) return null;

  if (typeof spec === "number" && Number.isFinite(spec)) {
    return spec > 0 ? spec : null;
  }

  const text = String(spec);
  const matches = text.match(/\d+(\.\d+)?/g);
  if (!matches) return null;

  const nums = matches.map(Number).filter(n => Number.isFinite(n));
  if (nums.length === 0) return null;

  const minDays = Math.min(...nums);
  return minDays > 0 ? minDays : null;
}

export function computeBaseGrowthRate(maxHeight: number | null | undefined, maturitySpec: any): number | null {
  if (!maxHeight || !Number.isFinite(maxHeight) || maxHeight <= 0) return null;

  const days = parseMaturityDays(maturitySpec);
  if (!days) return null;

  return maxHeight / days;
}
