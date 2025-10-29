import { useMemo } from "react";
import type { DayWeather } from "./useWeather";

export function useTemperature(
  day: DayWeather | null,
  tempMin: number | undefined,
  tempMax: number | undefined
) {
  return useMemo(() => {
    if (!day || tempMin == null || tempMax == null || tempMin >= tempMax) {
      return { tempEff: 1, tMeanC: day?.tMeanC ?? null };
    }
    const t = day.tMeanC;
    if (t <= tempMin || t >= tempMax) return { tempEff: 0, tMeanC: t };

    const mid = (tempMin + tempMax) / 2;
    const eff =
      t <= mid
        ? (t - tempMin) / Math.max(1e-6, mid - tempMin)
        : (tempMax - t) / Math.max(1e-6, tempMax - mid);

        console.log(
          "[useTemperature]",
          `tMean=${t?.toFixed(1)}°C, min=${tempMin}, max=${tempMax}, eff=${eff.toFixed(2)}`
        );

    return { tempEff: Math.max(0, Math.min(1, eff)), tMeanC: t };
  }, [day, tempMin, tempMax]);
}
