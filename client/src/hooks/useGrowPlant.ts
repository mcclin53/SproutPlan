import { useEffect, useRef, useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { APPLY_MIDNIGHT_GROWTH } from "../utils/mutations";

interface Plant {
  _id: string;
  name: string;
  sunReq: number;         // hours/day required for full efficiency
  baseGrowthRate: number; // inches per day at full efficiency
  height: number;
  canopyRadius: number;
  waterMin?: number;
  waterMax?: number;
  tempMin?: number;
  tempMax?: number;
  }

interface SunPosition {
  elevation: number; // degrees > 0 means sun is up
  azimuth: number;
}

interface GrowOptions {
  simulatedDate: Date;
  sun: SunPosition | null;
  shadedIds: string[];
  resetDaily?: boolean;
  simulateMidnight?: boolean;
  persist?: boolean;
  bedIdByPlant: Record<string, string>;
  modelVersion?: string;
  buildInputsForPlant?: (plant: Plant) => any;
  onAppliedOne?: (plantId: string, newHeight: number, newCanopy: number) => void;
  soilMoistureByBed?: Record<string, number>;
  hourlyTempC?: number[];
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function waterEffFor(
  plant: Plant,
  bedId: string,
  waterEffByBed?: Record<string, number>,
  soilMoistureByBed?: Record<string, number>
) {
  if (waterEffByBed && bedId in waterEffByBed) return clamp01(waterEffByBed[bedId]);

  const m = soilMoistureByBed?.[bedId];
  const min = plant.waterMin;
  const max = plant.waterMax;
  if (m == null || min == null || max == null || min >= max) return 1;

  if (m <= min) return 0;
  if (m >= max) return 1;
  return clamp01((m - min) / Math.max(1e-6, max - min));
}

export function useGrowPlant(
  plants: Plant[],
  options: GrowOptions
) {
  const {
    simulatedDate,
    sun,
    shadedIds,
    resetDaily = true,
    simulateMidnight = false,
    persist = true,
    bedIdByPlant,
    modelVersion = "growth-v2-size-per-day",
    buildInputsForPlant,
    onAppliedOne,
  } = options;

  const [grownPlants, setGrownPlants] = useState<Plant[]>(plants);
  const [sunlightHours, setSunlightHours] = useState<Record<string, number>>({});
  const [tempOkHours, setTempOkHours] = useState<Record<string, number>>({});

  const [applyMidnightGrowth] = useMutation(APPLY_MIDNIGHT_GROWTH); 

  const lastTickRef = useRef<number>(simulatedDate.getTime());
  const lastDayRef = useRef<string>(simulatedDate.toDateString());

  const lastMidnightAppliedKeyRef = useRef<string | null>(null);

  const prevGrownRef = useRef<Plant[]>(plants);
  
  // Accumulates sunlight hours per plant (based on shading + sun up)
  useEffect(() => {
    const now = simulatedDate.getTime();

    // Day rollover → optionally reset sunlight tally
    const day = simulatedDate.toDateString();
    if (day !== lastDayRef.current) {
      lastDayRef.current = day;
      lastTickRef.current = now;

      if (resetDaily && !simulateMidnight) {
        console.log("New simulated day → resetting sunlight hours");
        setSunlightHours({});
        setTempOkHours({});
      }
      return;
    }

    const deltaHours = (now - lastTickRef.current) / (1000 * 60 * 60);
    if (deltaHours <= 0) return; // guard first tick or clock skew
    lastTickRef.current = now;

    // Only accumulate when sun is up
    if (!sun || sun.elevation <= 0) return;

    const shadedSet = new Set(shadedIds);
    setSunlightHours(prev => {
      const next = { ...prev };
      for (const p of plants) {
        if (!shadedSet.has(p._id)) continue; }
        for (const p of plants) {
          if (!shadedSet.has(p._id)) {
          next[p._id] = (next[p._id] ?? 0) + deltaHours;
          console.log(`[Sunlight] ${p.name}: +${deltaHours.toFixed(2)}h  → total = ${next[p._id].toFixed(2)}h`);
          } 
        }
    return next;
    });

    if (options.hourlyTempC && options.hourlyTempC.length >= 24) {
      const hourIdx = simulatedDate.getHours();
      const tempNow = options.hourlyTempC[hourIdx];

      setTempOkHours(prev => {
        const next = { ...prev };
        for (const p of plants) {
          const tmin = p.tempMin ?? -Infinity;
          const tmax = p.tempMax ?? Infinity;
          const ok = tempNow >= tmin && tempNow <= tmax;
          if (ok) {
            next[p._id] = (next[p._id] ?? 0) + deltaHours;
          }
          console.log(
            "[TempHourly]",
            p.name,
            `h=${hourIdx}`,
            `T=${tempNow?.toFixed(1)}°C`,
            `range=${tmin}-${tmax}`,
            `ok=${ok}`,
            `acc=${(next[p._id] ?? 0).toFixed(2)}h`
          );
        }
        return next;
      });
    }
  }, [plants, shadedIds, sun?.elevation, simulatedDate, resetDaily, simulateMidnight, options.hourlyTempC]);

  // Growth using accumulated sunlight
  useEffect(() => {
    if (!simulateMidnight) return;

    const isMidnight = simulatedDate.getHours() === 0;
    if (!isMidnight) return;

    // A key that changes once per calendar day
    const midnightKey = simulatedDate.toDateString() + "@00";
    if (lastMidnightAppliedKeyRef.current === midnightKey) return; // already applied for this midnight
    lastMidnightAppliedKeyRef.current = midnightKey;

    const snapshotSunHours = { ...sunlightHours };
    const snapshotTempOk = { ...tempOkHours };

    // If persistence is disabled, keep old local-only behavior: compute a client delta and clamp visually.
    if (!persist) {
      // Minimal local apply (does NOT clamp to server caps; purely visual)
      const updated = plants.map(plant => {
      const hours = snapshotSunHours[plant._id] ?? 0;
      const sunReq = plant.sunReq || 0;
      const sunEff = sunReq > 0 ? Math.min(1, hours / sunReq) : 0;

      //growth by temperature
      const hoursTempOk = snapshotTempOk[plant._id] ?? 0;
      const tempEff = clamp01(hoursTempOk / 24);

    //water efficiency integration
      const bedId = bedIdByPlant[plant._id];
      const waterEff = waterEffFor(plant, bedId, options.soilMoistureByBed);
    
    // height/day in size units (e.g., inches) under full efficiency
      const baseRate = plant.baseGrowthRate || 0;

      const overallEff = sunEff * waterEff;
      const dH = baseRate * overallEff;
        // derive canopy/day proportionally (if you want; otherwise same as baseRate)
      const dC = dH; // simple: canopy grows at same unit rate

      const prev = prevGrownRef.current.find(x => x._id === plant._id) ?? plant;
      const newH = (prev.height ?? 0) + dH;
      const newC = (prev.canopyRadius ?? 0) + dC;
      

      console.log("[Midnight:local]", plant.name, {
      sunEff: sunEff.toFixed(2),
      tempEff: tempEff.toFixed(2),
      waterEff: waterEff.toFixed(2),
      baseRate,
      dH: dH.toFixed(2),
    });

    onAppliedOne?.(plant._id, newH, newC);

    return { ...plant, height: newH, canopyRadius: newC };
  });

  setGrownPlants(updated);
  prevGrownRef.current = updated;
  if (resetDaily) setSunlightHours({});
  return;
}

    // Persisted path: call the server once per plant
  let canceled = false;

  (async () => {
    try {
        // Normalize day to midnight ISO
      const dayISO = new Date(
      new Date(simulatedDate).setHours(0, 0, 0, 0)
      ).toISOString();

        // Apply sequentially (simpler) or in parallel (Promise.all)
      const results: { id: string; height: number; canopy: number }[] = [];

      for (const plant of plants) {
        const bedId = bedIdByPlant[plant._id];
        if (!bedId) {
            // eslint-disable-next-line no-console
          console.warn(`[applyMidnightGrowth] missing bedId for plant ${plant._id}`);
          continue;
        }

        const hours = snapshotSunHours[plant._id] ?? 0;

        const variables = {
          bedId,
          plantInstanceId: plant._id,
          day: dayISO,
           sunlightHours: hours,
          shadedHours: 0,
          modelVersion,
          inputs: buildInputsForPlant ? buildInputsForPlant(plant) : null,
        };

        const { data } = await applyMidnightGrowth({ variables });

        if (!data?.applyMidnightGrowth) continue;
        const { height, canopyRadius } = data.applyMidnightGrowth;

        results.push({ id: plant._id, height, canopy: canopyRadius });
        onAppliedOne?.(plant._id, height, canopyRadius);
      }

      if (canceled) return;

        // Merge server-updated values back into local grownPlants
      setGrownPlants(prev => {
        const map = new Map(results.map(r => [r.id, r]));
        return prev.map(p => {
          const r = map.get(p._id);
          return r ? { ...p, height: r.height, canopyRadius: r.canopy } : p;
        });
      });

      prevGrownRef.current = prevGrownRef.current.map(p => {
        const r = results.find(x => x.id === p._id);
        return r ? { ...p, height: r.height, canopyRadius: r.canopy } : p;
      });

        // New day: clear today’s sunlight tally
    if (resetDaily) setSunlightHours({});
    } catch (err) {
      console.error("[applyMidnightGrowth] error:", err);
        // Don’t clear sunlightHours on failure; allow retry next tick if desired
    }
  })();

    return () => {
      canceled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulateMidnight, simulatedDate]); // intentionally *not* depending on sunlightHours to avoid re-trigger

  // Keep grownPlants in sync if the list of plants changes (e.g., added/removed)
  useEffect(() => {
    setGrownPlants(plants);
    prevGrownRef.current = plants;
  }, [plants]);

  return { grownPlants, sunlightHours, tempOkHours };
}