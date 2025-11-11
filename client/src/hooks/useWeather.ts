import { useEffect, useMemo, useState } from "react";
import type { DayWeather, HourlyWeather } from "../utils/types";



function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDateOnly(d: Date) {
  return startOfDay(d)
  .toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function toDOY(d: Date) {
  const x = startOfDay(d);
  const start = new Date(x.getFullYear(), 0, 1);
  return Math.floor((x.getTime() - start.getTime()) / 86400000) + 1;
}

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "";

export function useWeather(lat: number, lon: number, targetDate: Date) {
  const [day, setDay] = useState<DayWeather | null>(null);
  const [hourly, setHourly] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const dayKey = useMemo(() => startOfDay(targetDate).getTime(), [
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ]);

  const dayISO = useMemo(() => isoDateOnly(targetDate), [dayKey]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Decide forecast vs. climatology by date distance
        const today0 = startOfDay(new Date());
        const date0 = startOfDay(targetDate);
        const ahead = daysBetween(today0, date0); // can be negative (past)

        if (ahead <= 15 && ahead >= 0) {
          // ---- Forecast path (Open-Meteo hourly up to ~16 days) ----
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation,et0_fao_evapotranspiration` +
      `&timezone=auto&start_date=${dayISO}&end_date=${dayISO}`;

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
          const sum = (a: number[]) => a.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
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
      } else {
        // Climatology path
        const doy = toDOY(targetDate);
        const dayIndex = doy;

        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          dayIndex: String(dayIndex),
        });

        const res = await fetch(`${API_BASE}/api/climo/hourly?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Climo HTTP ${res.status}`);
        const data = await res.json() as {
          timeISO: string[];
          temperature_2m: number[];
          precipitation: number[];
          et0Mm?: number[];
        };

        const t = data.temperature_2m ?? [];
        const p = data.precipitation ?? [];
        if (!t.length) {
          setDay(null);
          setHourly(null);
        } else {
          const sum = (a: number[]) => a.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
          const tMean = t.reduce((s, v) => s + v, 0) / t.length;
          const tMin = Math.min(...t);
          const tMax = Math.max(...t);

          setDay({
            dateISO: dayISO,
            tMeanC: tMean,
            tMinC: tMin,
            tMaxC: tMax,
            precipMm: sum(p),
            et0Mm: null, // no ET0 in climo yet
          });

          setHourly({
            timeISO: data.timeISO ?? Array.from({ length: 24 }, (_, h) => `${dayISO}T${String(h).padStart(2, "0")}:00:00`),
            tempC: t,
            precipMm: p,
            et0Mm: undefined,
          });
        }
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
  }, [lat, lon, dayKey]);

  return { day, hourly, loading, error };
}
