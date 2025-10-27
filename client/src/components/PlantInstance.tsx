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
        // defaults if DB doesn’t have them:
        sunReq: base.sunReq ?? 8,             // hours/day for 100% efficiency
        baseGrowthRate: base.baseGrowthRate ?? 1, // size units/day @ 100%
        height: plantInstance.height ?? 0,
        canopyRadius: plantInstance.canopyRadius ?? 0,
        // NOTE: we no longer include caps here—server clamps on midnight apply
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


  const { grownPlants, sunlightHours } = useGrowPlant(plantsForGrowth, {
    simulatedDate: simulatedDate ?? new Date(),
    sun,
    shadedIds,
    resetDaily: true,
    simulateMidnight: true,
    persist: true,
    bedIdByPlant,
    modelVersion: "growth-v2-size-per-day",
    buildInputsForPlant: (p) => ({ sunReq: p.sunReq, baseGrowthRate: p.baseGrowthRate }),
  });

  const grown = grownPlants[0];
  const hoursToday = sunlightHours[plantInstance._id] ?? 0;

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
        title={`${plantInstance.basePlant.name} (h: ${grown?.height?.toFixed(1)}", canopy: ${grown?.canopyRadius?.toFixed(1)}")`}
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
        onClick={() => handleRemovePlant(bedId, plantInstance._id)}
      >
        ❌
      </button>
    </div>
  );
}
