import { useEffect, useMemo, useRef, useState } from "react";

export const DeathReason = {
  TooCold: "too_cold",
  TooHot: "too_hot",
  TooDry: "too_dry",
  TooWet: "too_wet",
  NotEnoughSun: "not_enough_sun",
  OldAge: "old_age"
} as const;

export type DeathReason = (typeof DeathReason)[keyof typeof DeathReason];

export type DeathInfo = {
  dead: boolean;
  reason: DeathReason | null;
  diedAt: Date | null;
  details?: Record<string, unknown>;
};

type PlantBasics = {
  _id: string;
  name?: string;
  // optional plant-level fallbacks
  tempMin?: number | null;   // °C
  tempMax?: number | null;   // °C
  waterMin?: number | null;  // mm
  waterMax?: number | null;  // mm
  sunReq?: number | null;    // hours/day
};

type Inputs = {
  simulatedDate: Date;

  // WEATHER (useWeather)
  hourlyTempsC?: number[] | null; // useWeather.hourly?.tempC (length 24)
  dailyMeanTempC?: number | null; // useWeather.day?.tMeanC (fallback)

  // WATER (useWater)
  soilMoistureMm?: number | null;  // useWater.soil.moistureMm
  soilCapacityMm?: number | null;  // useWater.soil.capacityMm (for “too wet” fallback)
  waterMinMaxMm?: { min?: number | null; max?: number | null }; // useWater.waterMin/Max

  // SUN (useGrowPlant)
  sunTodayHours?: number | null;     // sunlightHours[plantId] for the current local day
  sunMinHours?: number | null;       // usually plant.sunReq


  plantedAt?: Date | string | null;   // when this instance was planted
    lifespanDays?: number | null;       // max age before old-age death
};

type Options = {
  graceHours?: { cold?: number; heat?: number; dry?: number; wet?: number }; // consecutive hours
  sunDailyGraceDays?: number; // consecutive bad days before death

  // When hourly temps missing, how to treat daily mean vs thresholds:
  treatDailyMeanAsHourly?: boolean; // default false = no hourly kill from daily mean

  // Optional callback when death occurs
  onDeath?: (info: DeathInfo) => void;
};

export function useDeath(
  plant: PlantBasics,
  inputs: Inputs,
  opts: Options = {}
): DeathInfo & {
  killNow: (reason: DeathReason, extraDetails?: Record<string, unknown>) => void;
} {
  const {
    simulatedDate,
    hourlyTempsC,
    dailyMeanTempC,
    soilMoistureMm,
    soilCapacityMm,
    waterMinMaxMm,
    sunTodayHours,
    sunMinHours,
    plantedAt,
    lifespanDays,
  } = inputs;

  const [state, setState] = useState<DeathInfo>({
    dead: false,
    reason: null,
    diedAt: null,
  });

  const coldH = useRef(0);
  const heatH = useRef(0);
  const dryH = useRef(0);
  const wetH = useRef(0);

  const badSunDays = useRef(0);
  const lastDayKey = useRef<string>("");

  const grace = useMemo(
    () => ({
      cold: opts.graceHours?.cold ?? 0,   // default: cold can be instant
      heat: opts.graceHours?.heat ?? 1,
      dry:  opts.graceHours?.dry  ?? 12,
      wet:  opts.graceHours?.wet  ?? 12,
    }),
    [opts.graceHours]
  );

  const sunGraceDays = opts.sunDailyGraceDays ?? 2;

  const effTempMin = plant.tempMin ?? null;
  const effTempMax = plant.tempMax ?? null;

  // Choose water thresholds: prefer useWater band; fall back to plant’s
  const effWaterMin =
    (waterMinMaxMm?.min ?? null) ?? (plant.waterMin ?? null);
  const effWaterMax =
    (waterMinMaxMm?.max ?? null) ?? (plant.waterMax ?? null);

  const effSunMin = (sunMinHours ?? null) ?? (plant.sunReq ?? null);

  const declareDeath = (reason: DeathReason, details?: Record<string, unknown>) => {
    if (state.dead) return;
    const info: DeathInfo = {
      dead: true,
      reason,
      diedAt: new Date(simulatedDate),
      details,
    };
    setState(info);
    opts.onDeath?.(info);
  };

  const killNow = (
    reason: DeathReason,
    extraDetails?: Record<string, unknown>
  ) => {
    declareDeath(reason, { ...extraDetails, debugKill: true });
  };

  useEffect(() => {
    if (state.dead) return;
    if (!plantedAt) return;
    if (typeof lifespanDays !== "number" || lifespanDays <= 0) return;

    const plantedDate =
      plantedAt instanceof Date ? plantedAt : new Date(plantedAt);
    if (Number.isNaN(plantedDate.getTime())) return;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const ageMs = simulatedDate.getTime() - plantedDate.getTime();
    const ageDays = ageMs / MS_PER_DAY;

    // die of old age once age passes lifespanDays
    if (ageDays > lifespanDays) {
      return declareDeath(DeathReason.OldAge, {
        ageDays,
        lifespanDays,
        plantId: plant._id,
        name: plant.name,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    simulatedDate.getTime(),
    plantedAt,
    lifespanDays,
    state.dead,
  ]);

  // hourly checks for temp and water
  useEffect(() => {
    if (state.dead) return;

    // infer current hour
    const hour = simulatedDate.getHours();

    // TEMP: prefer hourly; otherwise optionally treat daily mean as “this hour”
    let tempNow: number | null = null;
    if (hourlyTempsC && hourlyTempsC.length >= 24) {
      tempNow = hourlyTempsC[hour] ?? null;
    } else if (opts.treatDailyMeanAsHourly && typeof dailyMeanTempC === "number") {
      tempNow = dailyMeanTempC;
    }

    console.log("[Death debug: temp]", {
      plantId: plant._id,
      name: plant.name,
      hour,
      tempNow,
      effTempMin,
      effTempMax,
      coldHours: coldH.current,
      coldGrace: grace.cold,
    });

    if (tempNow != null) {
      if (typeof effTempMin === "number") {
        if (tempNow <= effTempMin) coldH.current += 1;
        else coldH.current = 0;
        if (coldH.current > grace.cold) {
          return declareDeath(DeathReason.TooCold, {
            tempC: tempNow, threshold: effTempMin, hours: coldH.current,
          });
        }
      }

      if (typeof effTempMax === "number") {
        if (tempNow >= effTempMax) heatH.current += 1;
        else heatH.current = 0;
        if (heatH.current > grace.heat) {
          return declareDeath(DeathReason.TooHot, {
            tempC: tempNow, threshold: effTempMax, hours: heatH.current,
          });
        }
      }
    }

    // WATER: thresholds are in mm (absolute)
    if (soilMoistureMm != null) {
      if (typeof effWaterMin === "number") {
        if (soilMoistureMm < effWaterMin) dryH.current += 1;
        else dryH.current = 0;

        console.log("[Death debug: water]", {
          plantId: plant._id,
          name: plant.name,
          soilMoistureMm,
          effWaterMin,
          effWaterMax,
          dryHours: dryH.current,
          dryGrace: grace.dry,
        });

        if (dryH.current > grace.dry) {
          return declareDeath(DeathReason.TooDry, {
            soilMoistureMm, minMm: effWaterMin, hours: dryH.current,
          });
        }
      }

      // “Too wet”: prefer explicit effWaterMax; otherwise near-capacity
      const wetThreshold =
        (typeof effWaterMax === "number" && effWaterMax) ||
        (typeof soilCapacityMm === "number" ? soilCapacityMm * 0.98 : null);

      if (typeof wetThreshold === "number") {
        if (soilMoistureMm > wetThreshold) wetH.current += 1;
        else wetH.current = 0;
        if (wetH.current > grace.wet) {
          return declareDeath(DeathReason.TooWet, {
            soilMoistureMm, maxMm: wetThreshold, hours: wetH.current,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    simulatedDate.getTime(),
    // stable deps:
    effTempMin, effTempMax, effWaterMin, effWaterMax, soilCapacityMm,
    grace.cold, grace.heat, grace.dry, grace.wet,
    hourlyTempsC, dailyMeanTempC, soilMoistureMm,
    opts.treatDailyMeanAsHourly,
    state.dead,
  ]);

  // ---- Daily check at midnight: SUN ------------------------------
  useEffect(() => {
    if (state.dead) return;
    if (typeof effSunMin !== "number") return;

    const dayKey = `${simulatedDate.getFullYear()}-${simulatedDate.getMonth() + 1}-${simulatedDate.getDate()}`;

    // When the day key changes, we are *in the new day* → evaluate yesterday using the
    // last provided sunTodayHours value from the previous render cycle.
    if (lastDayKey.current && lastDayKey.current !== dayKey) {
      const yesterdaySun = sunTodayHours ?? 0;
      if (yesterdaySun < effSunMin) {
        badSunDays.current += 1;
      } else {
        badSunDays.current = 0;
      }
      if (badSunDays.current > sunGraceDays) {
        return declareDeath(DeathReason.NotEnoughSun, {
          sunHours: yesterdaySun,
          minRequired: effSunMin,
          badSunDays: badSunDays.current,
        });
      }
    }

    lastDayKey.current = dayKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    simulatedDate.getHours(),
    effSunMin,
    sunTodayHours,
    sunGraceDays,
    state.dead,
  ]);

  return {
    ...state,
    killNow,
  };
}
