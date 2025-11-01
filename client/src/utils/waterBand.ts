export type WaterBandParams = {
  kc: number;                 // crop coefficient for the current stage
  et0Mm: number | null;       // daily ET0 in mm (can be null -> fallback used)
  capacityMm: number;         // bed soil storage capacity (mm)
  rootDepthM?: number;        // effective root depth (m)
  awcMmPerM?: number;         // loam AWC ~150 mm/m
};

export function computeWaterComfortBand({
  kc,
  et0Mm,
  capacityMm,
  rootDepthM = 0.3,
  awcMmPerM = 150,
}: WaterBandParams) {
  const et0 = et0Mm ?? 4;                    // sensible fallback if ET0 missing
  const etc = Math.max(0, kc * et0);         // mm/day
  // FAO-56 style depletion fraction (bounded)
  const p = Math.max(0.3, Math.min(0.8, 0.5 + 0.04 * (5 - etc)));

  const TAW = awcMmPerM * rootDepthM;        // mm
  const effectiveTAW = Math.max(0, Math.min(capacityMm, TAW));
  const RAW = p * effectiveTAW;

  const waterMax = Math.max(0, 0.9 * effectiveTAW);                 // comfy top
  const waterMin = Math.max(0, Math.min(waterMax, waterMax - RAW)); // comfy bottom

  return { waterMin, waterMax, etc, p, TAW: effectiveTAW };
}

export function guessRootDepthM(plantName: string): number {
  const n = plantName.toLowerCase();
  if (n.includes("lettuce")) return 0.2;
  if (n.includes("carrot"))  return 0.3;
  if (n.includes("pepper"))  return 0.45;
  if (n.includes("tomato"))  return 0.5;
  if (n.includes("cucumber"))return 0.45;
  return 0.3;
}
