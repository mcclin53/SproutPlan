// client/src/hooks/useWeather.ts
import { useEffect, useMemo, useState } from "react";

export type DayWeather = {
  dateISO: string;   // YYYY-MM-DD of simulated day
  tMeanC: number;    // mean temp °C
  tMinC: number;     // min temp °C
  tMaxC: number;     // max temp °C
  precipMm: number;  // total precipitation (mm)
  et0Mm?: number;     // FAO ET0 sum (mm)
};

export type HourlyWeather = {
  timeISO: string[];     // length ~24 for that day (local tz)
  tempC: number[];       // hourly temperature
  precipMm: number[];    // hourly precipitation
  et0Mm?: number[];      // optional hourly ET0 if you keep it
};

function isoDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function useWeather(lat: number, lon: number, date: Date) {
  const [day, setDay] = useState<DayWeather | null>(null);
  const [hourly, setHourly] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const dayISO = useMemo(() => isoDateOnly(date), [date]);

  useEffect(() => {
    const controller = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation,et0_fao_evapotranspiration` +
      `&timezone=auto&start_date=${dayISO}&end_date=${dayISO}`;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const json = await res.json();

        const timeISO: string[] = json?.hourly?.time ?? [];
        const t: number[] = json?.hourly?.temperature_2m ?? [];
        const p: number[] = json?.hourly?.precipitation ?? [];
        const e: number[] = json?.hourly?.et0_fao_evapotranspiration ?? [];

        if (!t.length) {
          setDay(null);
          setHourly(null);
        } else {
          const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
          const tMean = t.reduce((s, v) => s + v, 0) / t.length;
          const tMin = Math.min(...t);
          const tMax = Math.max(...t);

          console.log(
            "[useWeather]",
            dayISO,
            `→ tMean=${tMean.toFixed(1)}°C, tMin=${tMin.toFixed(1)}, tMax=${tMax.toFixed(1)}, precip=${sum(p).toFixed(2)}mm`
          );

          setDay({
            dateISO: dayISO,
            tMeanC: tMean,
            tMinC: tMin,
            tMaxC: tMax,
            precipMm: sum(p),
            et0Mm: sum(e),
          });

          setHourly({
            timeISO,
            tempC: t,
            precipMm: p,
            et0Mm: e.length ? e : undefined,
          });
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") setError(err);
        setDay(null);
        setHourly(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [lat, lon, dayISO]);

  return { day, hourly, loading, error };
}
