import { useEffect, useMemo, useRef, useState } from "react";
import type { DayWeather } from "./useWeather";
import { computeWaterComfortBand } from "../utils/waterBand";

export type SoilState = {
  capacityMm: number;
  moistureMm: number;
  percolationMmPerDay?: number;
};

export type UseWaterOptions = {
  bedId: string;
  day: DayWeather | null;
  initialSoil: SoilState;
  waterUseFactor?: number;      // scales ET0 usage; set 0 to ignore ET0
  kc?: number;                  // crop coefficient (e.g., KcMid)
  rootDepthM?: number;          // effective root depth (m)
  awcMmPerM?: number;           // loam ~150 mm/m; override if you like
  dynamicBand?: boolean;        // default true
  plantWaterMin?: number;       // mm where growth ~0 below
  plantWaterMax?: number;       // mm where growth ~1 above
};

export function useWater({
  bedId,
  day,
  initialSoil,
  waterUseFactor = 1.0,

  // dynamic band controls
  kc = 1.0,
  rootDepthM = 0.3,
  awcMmPerM = 150,
  dynamicBand = true,

  // explicit overrides
  plantWaterMin,
  plantWaterMax,
}: UseWaterOptions) {
  const [soil, setSoil] = useState<SoilState>(() => ({
    capacityMm: initialSoil.capacityMm,
    moistureMm: Math.min(initialSoil.moistureMm, initialSoil.capacityMm),
    percolationMmPerDay: initialSoil.percolationMmPerDay ?? 2,
  }));

  const lastAppliedDayRef = useRef<string | null>(null);

  // Advance soil once per simulated day
  useEffect(() => {
    if (!day) return;
    if (lastAppliedDayRef.current === day.dateISO) return;
    lastAppliedDayRef.current = day.dateISO;

    setSoil(prev => {
      const demand = (day.et0Mm ?? 0) * waterUseFactor; // ET0 demand
      const loss = prev.percolationMmPerDay ?? 0;       // drainage/percolation
      let next = prev.moistureMm + (day.precipMm ?? 0) - demand - loss;
      next = Math.max(0, Math.min(prev.capacityMm, next));

      console.log(
        "[useWater]",
        `day=${day.dateISO}`,
        `precip=${(day.precipMm ?? 0).toFixed(2)}mm`,
        `ET0=${day.et0Mm != null ? day.et0Mm.toFixed(2) : "n/a"}`,
        `prev=${prev.moistureMm.toFixed(2)} → next=${next.toFixed(2)}`
      );

      return { ...prev, moistureMm: next };
    });
  }, [day, waterUseFactor]);

  // Compute the dynamic comfort band from Kc × ET0 and soil capacity
  const band = useMemo(() => {
    if (!dynamicBand) {
      // If turned off, still return something useful
      const cap = soil.capacityMm;
      return {
        waterMin: 0,
        waterMax: cap,
        etc: (day?.et0Mm ?? 0) * kc,
        p: 0.5,
        tawMm: cap,
      };
    }
    const { waterMin, waterMax, etc, p, TAW } = computeWaterComfortBand({
      kc,
      et0Mm: day?.et0Mm ?? null,
      capacityMm: soil.capacityMm,
      rootDepthM,
      awcMmPerM,
    });
    return { waterMin, waterMax, etc, p, tawMm: TAW };
  }, [dynamicBand, kc, rootDepthM, awcMmPerM, day?.et0Mm, soil.capacityMm]);

  // Final thresholds (explicit overrides win; otherwise dynamic band)
  const effMin = typeof plantWaterMin === "number" ? plantWaterMin : band.waterMin;
  const effMax = typeof plantWaterMax === "number" ? plantWaterMax : band.waterMax;

  // Map soil moisture → 0..1 efficiency
  const waterEff = useMemo(() => {
    const m = soil.moistureMm;
    let eff: number;

    if (m <= effMin) eff = 0;
    else if (m >= effMax) eff = 1;
    else eff = (m - effMin) / Math.max(1e-6, effMax - effMin);

    console.log(
      "[useWater]",
      `Efficiency=${eff.toFixed(2)} | moisture=${m.toFixed(1)} / ${soil.capacityMm} mm`,
      `(range ${effMin.toFixed(1)}–${effMax.toFixed(1)} mm)`,
      `(Kc=${kc.toFixed(2)}, ETc=${band.etc.toFixed(2)}mm, p=${band.p.toFixed(2)}, TAW=${band.tawMm.toFixed(1)}mm)`
    );

    return eff;
  }, [soil.moistureMm, soil.capacityMm, effMin, effMax, kc, band.etc, band.p, band.tawMm]);

  const irrigate = (mm: number) =>
    setSoil(prev => ({
      ...prev,
      moistureMm: Math.max(0, Math.min(prev.capacityMm, prev.moistureMm + Math.max(0, mm))),
    }));

  // expose thresholds + debug info so UI can show them
  const waterMin = effMin;
  const waterMax = effMax;

  return {
    soil,
    waterEff,
    irrigate,
    // extras:
    waterMin,
    waterMax,
    kc,
    etcMmPerDay: band.etc,
    depletionFractionP: band.p,
    tawMm: band.tawMm,
  };
}
