import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { APPLY_MIDNIGHT_GROWTH } from "../utils/mutations";
import { computePhase } from "../utils/growthPhases";
import { useDeath, DeathReason } from "./useDeath";

type GrowthPhase = "seed" | "vegetative" | "flowering" | "fruiting" | "dead";

interface Plant {
  _id: string;
  name: string;
  sunReq: number;         // hours/day required for full efficiency
  baseGrowthRate: number; // size units per day at full efficiency
  height: number;
  canopyRadius: number;
  waterMin?: number;
  waterMax?: number;
  tempMin?: number;
  tempMax?: number;
  plantedAt?: Date | string;
  germinationDays?: number;
  floweringDays?: number;
  fruitingDays?: number;
  lifespanDays?: number;
  phase?: GrowthPhase;
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
  deadIds?: string[];
  onDaylightSummary?: (summary: Record<string, number>) => void;
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
  const currentDayRef = useRef<string | null>(simulatedDate.toDateString());
  const prevGrownRef = useRef<Plant[]>(plants);

  // Refs for always-fresh tallies at day-change time
  const sunlightRef = useRef<Record<string, number>>({});
  const tempOkRef = useRef<Record<string, number>>({});

  useEffect(() => {
    sunlightRef.current = sunlightHours;
  }, [sunlightHours]);

  useEffect(() => {
    tempOkRef.current = tempOkHours;
  }, [tempOkHours]);

  useEffect(() => {
    const now = simulatedDate.getTime();
    const day = simulatedDate.toDateString();

    const deadSet = new Set(options.deadIds ?? []);

    // initialize
    if (currentDayRef.current == null) {
      currentDayRef.current = day;
      lastTickRef.current = now;
      return;
    }

    // Detect calendar day change
    if (day !== currentDayRef.current) {
      const prevDayKey = currentDayRef.current;
      const snapshotSunHours = { ...sunlightRef.current };
      const snapshotTempOk = { ...tempOkRef.current };
      options.onDaylightSummary?.(snapshotSunHours);

      console.log(
        "%c[DayChange]",
        "color:#00bfff;font-weight:bold",
        "from",
        prevDayKey,
        "to",
        day,
        "| simulateMidnight=",
        simulateMidnight,
        "persist=",
        persist
      );

      currentDayRef.current = day;
      lastTickRef.current = now;

      const prevDayDate = new Date(
        new Date(simulatedDate).getTime() - 24 * 60 * 60 * 1000
      );

      // Handle “midnight growth” for the *previous* day
      if (simulateMidnight) {
        if (!persist) {
          // Local-only growth
          const updated = plants.map(plant => {

            if (deadSet.has(plant._id)) {
              const prev = prevGrownRef.current.find(x => x._id === plant._id) ?? plant;
              console.log("[Midnight:local] Skipping growth for dead plant", plant.name);
              onAppliedOne?.(plant._id, prev.height, prev.canopyRadius);
              return prev;
            }

            const hours = snapshotSunHours[plant._id] ?? 0;
            const sunReq = plant.sunReq || 0;
            const sunEff = sunReq > 0 ? Math.min(1, hours / sunReq) : 0;

            const hoursTempOk = snapshotTempOk[plant._id] ?? 0;
            const tempEff = clamp01(hoursTempOk / 24);

            const bedId = bedIdByPlant[plant._id];
            const waterEff = waterEffFor(
              plant,
              bedId,
              undefined,
              options.soilMoistureByBed
            );

            let phase: GrowthPhase = "vegetative";
            const plantedAt = plant.plantedAt;
            if (plantedAt) {
              const plantedDate =
                plantedAt instanceof Date ? plantedAt : new Date(plantedAt);
              const { phase: ph } = computePhase(plantedDate, prevDayDate, {
                germinationDays: plant.germinationDays,
                floweringDays: plant.floweringDays,
                fruitingDays: plant.fruitingDays,
                lifespanDays: plant.lifespanDays,
              });
              phase = ph;
            }

            // If seed or dead, no size growth
            if (phase === "seed" || phase === "dead") {
              console.log("[Midnight:local] No growth due to phase", plant.name, phase);
              const prev = prevGrownRef.current.find(x => x._id === plant._id) ?? plant;
              onAppliedOne?.(plant._id, prev.height, prev.canopyRadius);
              return { ...prev, phase };
            }

            // tweak growth by phase
            let phaseMultiplier = 1;
            if (phase === "flowering") phaseMultiplier = 0.8;
            if (phase === "fruiting") phaseMultiplier = 0.5;

            const baseRate = plant.baseGrowthRate || 0;
            const overallEff = sunEff * waterEff * tempEff;
            const dH = baseRate * overallEff;
            const dC = dH;

            const prev = prevGrownRef.current.find(x => x._id === plant._id) ?? plant;
            const newH = (prev.height ?? 0) + dH;
            const newC = (prev.canopyRadius ?? 0) + dC;

            console.log("[Midnight:local]", plant.name, {
              phase,
              sunEff: sunEff.toFixed(2),
              tempEff: tempEff.toFixed(2),
              waterEff: waterEff.toFixed(2),
              baseRate,
              dH: dH.toFixed(2),
            });

            onAppliedOne?.(plant._id, newH, newC);

            return { ...plant, height: newH, canopyRadius: newC, phase };
          });

          setGrownPlants(updated);
          prevGrownRef.current = updated;
        } else {
          // Persisted path
          (async () => {
            try {
              
              const dayISO = new Date(
                prevDayDate.setHours(0, 0, 0, 0)
              ).toISOString();

              const results: { id: string; height: number; canopy: number }[] = [];

              for (const plant of plants) {

                if (deadSet.has(plant._id)) {
                  console.log("[applyMidnightGrowth] Skipping dead plant", plant.name);
                  continue;
                }
                const bedId = bedIdByPlant[plant._id];
                if (!bedId) {
                  console.warn(
                    `[applyMidnightGrowth] missing bedId for plant ${plant._id}`
                  );
                  continue;
                }

                const hours = snapshotSunHours[plant._id] ?? 0;
                const hoursTempOk = snapshotTempOk[plant._id] ?? 0;

                let phase: GrowthPhase | undefined;
                if (plant.plantedAt) {
                  const plantedDate =
                    plant.plantedAt instanceof Date
                      ? plant.plantedAt
                      : new Date(plant.plantedAt);
                  const { phase: ph } = computePhase(plantedDate, prevDayDate, {
                    germinationDays: plant.germinationDays,
                    floweringDays: plant.floweringDays,
                    fruitingDays: plant.fruitingDays,
                    lifespanDays: plant.lifespanDays,
                  });
                  phase = ph;
                }

                const variables = {
                  bedId,
                  plantInstanceId: plant._id,
                  day: dayISO,
                  sunlightHours: hours,
                  shadedHours: 0,
                  tempOkHours: hoursTempOk,
                  modelVersion,
                  inputs: buildInputsForPlant ? buildInputsForPlant(plant) : null,
                };

                const { data } = await applyMidnightGrowth({ variables });
                if (!data?.applyMidnightGrowth) continue;

                const { height, canopyRadius } = data.applyMidnightGrowth;
                results.push({ id: plant._id, height, canopy: canopyRadius });
                onAppliedOne?.(plant._id, height, canopyRadius);
              }

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
            } catch (err) {
              console.error("[applyMidnightGrowth] error:", err);
            }
          })();
        }
      }

      // reset tallies after a day change (if resetDaily)
      if (resetDaily) {
        console.log("[DayChange] Resetting sunlight & tempOk hours");
        setSunlightHours({});
        setTempOkHours({});
        sunlightRef.current = {};
        tempOkRef.current = {};
      }

      return;
    }

    // Same calendar day → accumulate sun & temp
    const deltaHours = (now - lastTickRef.current) / (1000 * 60 * 60);
    if (deltaHours <= 0) return;
    lastTickRef.current = now;

    // Only accumulate when sun is up
    if (!sun || sun.elevation <= 0) return;

    const shadedSet = new Set(shadedIds);

    setSunlightHours(prev => {
      const next = { ...prev };
      for (const p of plants) {
        if (deadSet.has(p._id)) continue;
        if (shadedSet.has(p._id)) continue; // shaded → no sun
        next[p._id] = (next[p._id] ?? 0) + deltaHours;
        console.log(
          `[Sunlight] ${p.name}: +${deltaHours.toFixed(2)}h → total = ${next[p._id].toFixed(
            2
          )}h`
        );
      }
      return next;
    });

    if (options.hourlyTempC && options.hourlyTempC.length >= 24) {
      const hourIdx = simulatedDate.getHours();
      const tempNow = options.hourlyTempC[hourIdx];

      setTempOkHours(prev => {
        const next = { ...prev };
        for (const p of plants) {
          if (deadSet.has(p._id)) continue;

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
  }, [
    simulatedDate,
    sun?.elevation,
    shadedIds,
    plants,
    resetDaily,
    simulateMidnight,
    persist,
    bedIdByPlant,
    modelVersion,
    buildInputsForPlant,
    applyMidnightGrowth,
    onAppliedOne,
    options.hourlyTempC,
    options.soilMoistureByBed,
  ]);

  // Keep grownPlants in sync when list changes
  useEffect(() => {
    setGrownPlants(plants);
    prevGrownRef.current = plants;
  }, [plants]);

  return { grownPlants, sunlightHours, tempOkHours };
}
