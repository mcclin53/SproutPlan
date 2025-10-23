import { useEffect, useRef, useState } from "react";

interface Plant {
  _id: string;
  name: string;
  sunReq: number;         // hours/day required for full efficiency
  baseGrowthRate: number; // inches per day at full efficiency
  height: number;
  canopyRadius: number;
  maxHeight: number;
  maxCanopyRadius: number;
  maturityDays: number;   // days to reach full size at 100% efficiency
  growthStage?: number;   // 0..1
}

interface SunPosition {
  elevation: number; // degrees > 0 means sun is up
  azimuth: number;
}

interface GrowOptions {
  /** Current simulated time */
  simulatedDate: Date;
  /** Current sun position (null or elevation<=0 => no sun accumulation) */
  sun: SunPosition | null;
  /** IDs of plants currently shaded this tick */
  shadedIds: string[];
  /** Reset the sunlight tally at the start of each simulated day (default: true) */
  resetDaily?: boolean;
  /** If true, only apply growth when simulated hour === 0 (midnight) */
  simulateMidnight?: boolean;
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
  } = options;

  const [grownPlants, setGrownPlants] = useState<Plant[]>(plants);
  const [sunlightHours, setSunlightHours] = useState<Record<string, number>>({});

  const lastTickRef = useRef<number>(simulatedDate.getTime());
  const lastDayRef = useRef<string>(simulatedDate.toDateString());

  const prevGrownRef = useRef<Plant[]>(plants);
  const lastMidnightAppliedRef = useRef<string | null>(null);

  // 1) Accumulate sunlight hours per plant (based on shading + sun up)
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
        if (!shadedSet.has(p._id)) {
          next[p._id] = (next[p._id] ?? 0) + deltaHours;
          console.log(
          `[Sunlight] ${p.name}: +${deltaHours.toFixed(2)}h  → total = ${next[p._id].toFixed(2)}h`
        );
      } else {
        console.log(`[Shaded] ${p.name}: skipped this tick`);
      }
    }
    return next;
    });
  }, [plants, shadedIds, sun?.elevation, simulatedDate, resetDaily, simulateMidnight]);

  // Growth using accumulated sunlight
  useEffect(() => {
    // If batching growth at midnight, only run when hour === 0
    if (simulateMidnight && simulatedDate.getHours() !== 0) return;

    const now = simulatedDate.getTime();
    const deltaHours = (now - lastTickRef.current) / (1000 * 60 * 60);

    const isMidnight = simulatedDate.getHours() === 0;
    const midnightKey = simulatedDate.toDateString() + "@00";

    if (simulateMidnight && isMidnight) {
      if (lastMidnightAppliedRef.current === midnightKey) return;
      lastMidnightAppliedRef.current = midnightKey;
    }
    
    const updated = plants.map(plant => {
    const prev = prevGrownRef.current.find(p => p._id === plant._id) ?? plant;

    const hours = sunlightHours[plant._id] ?? 0;
    const sunReq = plant.sunReq || 0; // hours/day for full efficiency
    const sunlightRatio = sunReq > 0 ? Math.min(1, hours / sunReq) : 0;

    // --- HEIGHT growth in size units (no division by max) ---
    const baseHeightRate = plant.baseGrowthRate || 0; // e.g., inches/day @ 100%
    const dayFactor = simulateMidnight ? 1 : Math.max(0, deltaHours) / 24;
    const deltaHeight = baseHeightRate * sunlightRatio * dayFactor;

    // cap using maxHeight only as a ceiling
    const maxHeight = plant.maxHeight ?? Infinity;
    const newHeight = Math.min(maxHeight, (prev.height ?? 0) + deltaHeight);

    const maxCanopyRadius = plant.maxCanopyRadius ?? Infinity;
    const derivedCanopyRate =
      (isFinite(maxHeight) && isFinite(maxCanopyRadius) && maxHeight > 0)
        ? baseHeightRate * (maxCanopyRadius / maxHeight)
        : baseHeightRate; // if no maxes, grow canopy at same unit rate as height

    const deltaCanopy = derivedCanopyRate * sunlightRatio * dayFactor;
    const newCanopy = Math.min(maxCanopyRadius, (prev.canopyRadius ?? 0) + deltaCanopy);

    const newStage =
      isFinite(maxHeight) && maxHeight > 0 ? Math.min(1, newHeight / maxHeight) : (prev.growthStage ?? 0);

      if (simulateMidnight && isMidnight) {
      const dH = newHeight - (prev.height ?? 0);
      const dC = newCanopy - (prev.canopyRadius ?? 0);
      console.log(
        `[GROWTH @ MIDNIGHT ${simulatedDate.toLocaleDateString()}] ${plant.name}: ` +
          `${hours.toFixed(2)}h sun (eff ${(sunlightRatio * 100).toFixed(0)}%) ` +
          `| height ${dH.toFixed(3)} → ${newHeight.toFixed(3)} ` +
          `| canopy ${dC.toFixed(3)} → ${newCanopy.toFixed(3)}`
      );
    }

      return {
        ...plant,
        height: newHeight,
        canopyRadius: newCanopy,
        growthStage: newStage,
      };
    });

    setGrownPlants(updated);
    prevGrownRef.current = updated;

    if (simulateMidnight && isMidnight && resetDaily) {
      setSunlightHours({});
    }

  }, [plants, sunlightHours, simulateMidnight, simulatedDate]);

  return { grownPlants, sunlightHours };
}
