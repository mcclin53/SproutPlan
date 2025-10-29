// client/src/hooks/useWater.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { DayWeather } from "./useWeather";

export type SoilState = {
  capacityMm: number;
  moistureMm: number;
  percolationMmPerDay?: number;
};

export type UseWaterOptions = {
  bedId: string;
  day: DayWeather | null;
  initialSoil: SoilState;
  waterUseFactor?: number;     // scales ET0 usage; set 0 to ignore ET0
  plantWaterMin?: number;      // mm where growth ~0 below
  plantWaterMax?: number;      // mm where growth ~1 above
};

export function useWater({
  bedId,
  day,
  initialSoil,
  waterUseFactor = 1.0,
  plantWaterMin = 0,
  plantWaterMax = initialSoil.capacityMm,
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
      const demand = (day.et0Mm ?? 0) * waterUseFactor;
      const loss = prev.percolationMmPerDay ?? 0;
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

  // Map soil moisture → 0..1 efficiency (no self-reference!)
  const waterEff = useMemo(() => {
    const m = soil.moistureMm;
    let eff: number;

    if (m <= plantWaterMin) eff = 0;
    else if (m >= plantWaterMax) eff = 1;
    else eff = (m - plantWaterMin) / Math.max(1e-6, plantWaterMax - plantWaterMin);

    console.log(
      "[useWater]",
      `Efficiency=${eff.toFixed(2)} | moisture=${m.toFixed(1)} / ${soil.capacityMm} mm`,
      `(range ${plantWaterMin}-${plantWaterMax} mm)`
    );

    return eff;
  }, [soil.moistureMm, soil.capacityMm, plantWaterMin, plantWaterMax]);

  const irrigate = (mm: number) =>
    setSoil(prev => ({
      ...prev,
      moistureMm: Math.max(0, Math.min(prev.capacityMm, prev.moistureMm + Math.max(0, mm))),
    }));

  return { soil, waterEff, irrigate };
}
