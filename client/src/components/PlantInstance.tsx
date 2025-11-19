import React, { useState, useMemo } from "react";
import useDragPlant from "../hooks/useDragPlant";
import { useGrowPlant } from "../hooks/useGrowPlant";
import { useDeath, DeathReason } from "../hooks/useDeath";
import { resolvePlantImageSrc, handleImageError } from "../utils/plantImage";
import type { StressOverrides } from "../utils/types";

type GraceHours = {
  cold?: number;
  heat?: number;
  dry?: number;
  wet?: number;
};

type GrowthPhase = "seed" | "vegetative" | "flowering" | "fruiting" | "dead";

interface BasePlant {
  _id: string;
  name: string;
  image?: string;
  waterReq?: string;
  spacing?: number;
  sunReq?: number;
  baseGrowthRate?: number;
  maxHeight?: number;
  maxCanopyRadius?: number;
  tempMin?: number;
  tempMax?: number;
  waterMin?: number;
  waterMax?: number;
  graceHours?: GraceHours;
  sunGraceDays?: number;
  germinationDays?: number;
  floweringDays?: number;
  fruitingDays?: number;
  lifespanDays?: number;
}

interface PlantInstance {
  _id: string;
  basePlant: BasePlant;
  x: number;
  y: number;
  height?: number;
  canopyRadius?: number;
  plantedAt: string | Date;
  phase?: GrowthPhase;
}

interface Props {
  plantInstance: PlantInstance;
  bedId: string;
  movePlantInBed: (bedId: string, plantId: string, newX: number, newY: number) => void;
  getPlantCoordinates: (bedId: string, plantId: string) => { x: number; y: number } | undefined;
  handleRemovePlant: (bedId: string, plantInstanceId: string) => void;
  sunDirection?: { azimuth: number; elevation: number } | null;
  simulatedDate?: Date;
  shadedIds: string[];
  isShaded?: boolean;
  dayWeather?: { dateISO: string;tMeanC: number; tMinC: number; tMaxC: number; precipMm: number; et0Mm?: number; } | null;
  soil?: { moistureMm: number };
  hourlyTempsC?: number[];
  onPlantClick?: (payload: { plantInstance: PlantInstance; bedId: string }) => void;
  onLiveStats?: (payload: {
  plantId: string;
  height?: number;
  canopy?: number;
  sunHours?: number;
  tempOkHours?: number;
  isDead?: boolean;
  deathReason?: string;
}) => void;
  debugOverrides?: StressOverrides;
}

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export default function PlantInstanceComponent({
  plantInstance,
  bedId,
  movePlantInBed,
  getPlantCoordinates,
  handleRemovePlant,
  sunDirection,
  simulatedDate,
  shadedIds,
  isShaded = false,
  dayWeather,
  soil,
  hourlyTempsC,
  onPlantClick,
  onLiveStats,
  debugOverrides
}: Props) {
  const bp = plantInstance.basePlant;

  const { ref, isDraggingPlant } = useDragPlant({
    plantInstanceId: plantInstance._id,
    bedId,
    movePlantInBed,
    getPlantCoordinates,
  });

  const plantForGrowth = useMemo(() => {
    const base = plantInstance.basePlant;
    return {
        _id: plantInstance._id,
        name: base.name,
        sunReq: base.sunReq ?? 8,             // hours/day for 100% efficiency
        baseGrowthRate: base.baseGrowthRate ?? 1, // size units/day @ 100%
        height: plantInstance.height ?? 0,
        canopyRadius: plantInstance.canopyRadius ?? 0,
        tempMin: base.tempMin ?? 10,
        tempMax: base.tempMax ?? 35,
        waterMin: base.waterMin ?? 10,
        waterMax: base.waterMax ?? 50,
      };
    }, [
      plantInstance._id,
      plantInstance.basePlant.name,
      plantInstance.basePlant.sunReq,
      plantInstance.basePlant.baseGrowthRate,
      plantInstance.height,
      plantInstance.canopyRadius,
    ]);

  const plantsForGrowth = useMemo(() => [plantForGrowth], [plantForGrowth]);

  const sun = sunDirection
    ? { elevation: sunDirection.elevation, azimuth: sunDirection.azimuth }
    : null;

  const bedIdByPlant = useMemo(
    () => ({ [plantInstance._id]: bedId }),
    [plantInstance._id, bedId]
  );

  const hourlyTempC = useMemo(() => {
  if (debugOverrides?.enabled && typeof debugOverrides.tempC === "number") {
    // Admin override: force same temp all day
    return new Array(24).fill(debugOverrides.tempC);
  }

  if (hourlyTempsC && hourlyTempsC.length >= 24) {
    return hourlyTempsC;
  }

  if (dayWeather) {
    return new Array(24).fill(dayWeather.tMeanC);
  }

  return undefined;
}, [debugOverrides?.enabled, debugOverrides?.tempC, hourlyTempsC, dayWeather]);

  const { grownPlants, sunlightHours, tempOkHours } = useGrowPlant(plantsForGrowth, {
    simulatedDate: simulatedDate ?? new Date(),
    sun,
    shadedIds,
    resetDaily: true,
    simulateMidnight: true,
    bedIdByPlant,
    modelVersion: "growth-v2-size-per-day",
    buildInputsForPlant: (p) => ({ 
      sunReq: p.sunReq,
      baseGrowthRate: p.baseGrowthRate,
      tMeanC: dayWeather?.tMeanC ?? null,
      tMinC: dayWeather?.tMinC ?? null,
      tMaxC: dayWeather?.tMaxC ?? null,
      precipMm: dayWeather?.precipMm ?? null,
      et0Mm: dayWeather?.et0Mm ?? null,
      soilMoistureMm: soil?.moistureMm ?? null,
     }),
     hourlyTempC,
  });

  const grown = grownPlants[0];
  const hoursToday = sunlightHours[plantInstance._id] ?? 0;
  const tempOk = tempOkHours?.[plantInstance._id] ?? 0;

  const death = useDeath(
    {
      _id: plantInstance._id,
      name: plantInstance.basePlant.name,
      tempMin: plantInstance.basePlant.tempMin ?? null,
      tempMax: plantInstance.basePlant.tempMax ?? null,
      waterMin: plantInstance.basePlant.waterMin ?? null,
      waterMax: plantInstance.basePlant.waterMax ?? null,
      sunReq: plantInstance.basePlant.sunReq ?? null,
    },
    {
      simulatedDate: simulatedDate ?? new Date(),
      hourlyTempsC: hourlyTempC ?? null,
      dailyMeanTempC: dayWeather?.tMeanC ?? null,
      soilMoistureMm:
        debugOverrides?.enabled && typeof debugOverrides.soilMoisture === "number"
      ? debugOverrides.soilMoisture
      : soil?.moistureMm ?? null,
      soilCapacityMm: null,
      waterMinMaxMm: {
        min: plantInstance.basePlant.waterMin ?? null,
        max: plantInstance.basePlant.waterMax ?? null,
      },
      sunTodayHours: hoursToday,
      sunMinHours: plantInstance.basePlant.sunReq ?? null,
      plantedAt: plantInstance.plantedAt,
      lifespanDays: plantInstance.basePlant.lifespanDays,
    },
    {
      graceHours: {
        cold: plantInstance.basePlant.graceHours?.cold ?? 0,
        heat: plantInstance.basePlant.graceHours?.heat ?? 1,
        dry: plantInstance.basePlant.graceHours?.dry ?? 12,
        wet: plantInstance.basePlant.graceHours?.wet ?? 12,
      },
      sunDailyGraceDays: plantInstance.basePlant.sunGraceDays ?? 2,
      onDeath: (info) => console.log("[Death]", plantInstance.basePlant.name, info),
    }
  );

  React.useEffect(() => {
    onLiveStats?.({
      plantId: plantInstance._id,
      height: grown?.height,
      canopy: grown?.canopyRadius,
      sunHours: hoursToday,
      tempOkHours: tempOk,
      isDead: death.dead,
      deathReason: death.reason ?? undefined,
    });
  }, [onLiveStats, plantInstance._id, grown?.height, grown?.canopyRadius, hoursToday, tempOk, death.dead, death.reason]);

  const azimuth = sunDirection?.azimuth ?? 180; // Default south
  const elevation = sunDirection?.elevation ?? 45; // Default mid-sky
  const isNight = elevation <= 0;

  const lightIntensity = Math.max(0, Math.min(1, elevation / 90));
  const effectiveLight = isShaded ? 0 : lightIntensity;
  const gradientAngle = (450 - azimuth) % 360;

  const azRad = (azimuth * Math.PI) / 180;
  const shadowDistance = (1 - effectiveLight) * 15;
  const shadowX = -Math.sin(azRad) * shadowDistance;
  const shadowY =  Math.cos(azRad) * shadowDistance;

  const shadowBlur = 15 * (1 - effectiveLight) + 5;
  const shadowColor = `rgba(0,0,0,${0.3 * (1 - effectiveLight)})`;

  const boxShadowStyle = isNight ? "none" : `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;

  return (
    <div
      className="plant-wrapper"
      ref={ref}
      onClick={() => onPlantClick?.({ plantInstance, bedId })}
      style={{
        position: "absolute",
        top: plantInstance.y,
        left: plantInstance.x,
        opacity: isDraggingPlant ? 0.5 : 1,
        cursor: "move",
        width: 40,
        height: 40,
        transition: "opacity 0.3s ease, filter 0.3s ease",
      }}
      title={
        death.dead
          ? `${plantInstance.basePlant.name} — ☠️ Died: ${death.reason ?? "unknown"}`
          : `${plantInstance.basePlant.name} — ${hoursToday.toFixed(1)}h sun today`
      }
    >
      <img
        src={resolvePlantImageSrc(bp.image)}
        alt={plantInstance.basePlant.name}
        title={ `"Click for Plant Stats" || "Died because ${death.reason}"`}
        style={{
          width: 40,
          height: 40,
          filter: death.dead
            ? "grayscale(1) brightness(0.6)"
            : `brightness(${0.6 + effectiveLight * 0.8})`,
          boxShadow: death.dead ? "none" : boxShadowStyle,
          transition: "filter 0.5s ease-in-out, box-shadow 0.5s ease-in-out",
          borderRadius: "50%",
        }}
        onError={handleImageError}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(${gradientAngle}deg, rgba(255,255,200,${0.3 * effectiveLight}) 0%, transparent 70%)`,
          pointerEvents: "none",
          borderRadius: "50%",
          transition: "all 0.5s ease-in-out",
        }}
      />
      {death.dead && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            fontSize: 22,
          }}
        >
          ☠️
        </div>
      )}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            bottom: -18,
            left: 0,
            display: "flex",
            gap: 4,
            fontSize: 9,
          }}
        >
              {/* <button
            type="button"
            onClick={() => death.killNow(DeathReason.TooCold)}
          >
            Kill cold
          </button>
          <button
            type="button"
            onClick={() => death.killNow(DeathReason.TooDry)}
          >
            Kill dry
          </button> */}
        </div>
      )}
      <button
        className="remove-plant-button"
        title="Remove Plant"
        onClick={() => handleRemovePlant(bedId, plantInstance._id)}
      >
        ❌
      </button>
    </div>
  );
}
