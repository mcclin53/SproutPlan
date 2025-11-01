import React, { useState, useMemo } from "react";
import useDragPlant from "../hooks/useDragPlant";
import { useGrowPlant } from "../hooks/useGrowPlant";

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
}

interface PlantInstance {
  _id: string;
  basePlant: BasePlant;
  x: number;
  y: number;
  height?: number;
  canopyRadius?: number;
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
  tempOkHours?: number; // keep for later if you wire it
}) => void;
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
}: Props) {
  const [failedImages, setFailedImages] = useState(false);

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

  const hourlyTempC = useMemo(
    () =>
      hourlyTempsC && hourlyTempsC.length >= 24
        ? hourlyTempsC
        : dayWeather
        ? new Array(24).fill(dayWeather.tMeanC) // fallback so tempOkHours can still advance
        : undefined,
    [hourlyTempsC, dayWeather]
  );

  const { grownPlants, sunlightHours, tempOkHours } = useGrowPlant(plantsForGrowth, {
    simulatedDate: simulatedDate ?? new Date(),
    sun,
    shadedIds,
    resetDaily: true,
    simulateMidnight: true,
    persist: true,
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
  React.useEffect(() => {
  onLiveStats?.({
    plantId: plantInstance._id,
    height: grown?.height,
    canopy: grown?.canopyRadius,
    sunHours: hoursToday,
    tempOkHours: tempOk,
  });
}, [onLiveStats, plantInstance._id, grown?.height, grown?.canopyRadius, hoursToday, tempOk]);

  const imgField = plantInstance.basePlant.image;
  const remote =
    imgField && imgField.startsWith("/")
      ? `${BASE_URL}${imgField}`
      : imgField
      ? `${BASE_URL}/images/${imgField}`
      : `${BASE_URL}/images/placeholder.png`;
  const imageSrc = failedImages ? `${BASE_URL}/images/placeholder.png` : remote;

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
        // filter: isShaded ? "brightness(0.7)" : "none",
        cursor: "move",
        width: 40,
        height: 40,
        transition: "opacity 0.3s ease, filter 0.3s ease",
      }}
      title={`${plantInstance.basePlant.name} — ${hoursToday.toFixed(1)}h sun today`}
    >
      <img
        src={imageSrc}
        alt={plantInstance.basePlant.name}
        title="Click for Plant Stats"
        style={{
          width: 40,
          height: 40,
          filter: `brightness(${0.6 + effectiveLight * 0.8})`,
          boxShadow: boxShadowStyle,
          transition: "filter 0.5s ease-in-out, box-shadow 0.5s ease-in-out",
          borderRadius: "50%",
        }}
        onError={(e) => {
          setFailedImages(true);
          const target = e.target as HTMLImageElement;
          if (!target.src.endsWith("/images/placeholder.png")) {
            target.src = `${BASE_URL}/images/placeholder.png`;
          }
        }}
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
