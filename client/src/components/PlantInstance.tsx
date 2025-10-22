import React, { useState } from "react";
import useDragPlant from "../hooks/useDragPlant";
import { useShadow } from "../hooks/useShadow";
import { useGrowPlant } from "../hooks/useGrowPlant";

interface BasePlant {
  _id: string;
  name: string;
  image?: string;
  waterReq?: string;
  spacing?: number;
  sunReq: number;
  baseGrowthRate: number;
  maxHeight: number;
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
}: Props) {
  const [failedImages, setFailedImages] = useState(false);

  const { ref, isDraggingPlant } = useDragPlant({
    plantInstanceId: plantInstance._id,
    bedId,
    movePlantInBed,
    getPlantCoordinates,
  });

  // Convert PlantInstance -> SceneObject for hooks
  const sceneObject = {
    _id: plantInstance._id,
    type: "plant" as const,
    basePlantId: plantInstance.basePlant._id,
    ...plantInstance.basePlant, // name, sunReq, baseGrowthRate, maxHeight
    x: plantInstance.x,
    y: plantInstance.y,
    height: plantInstance.height ?? 0,
    canopyRadius: plantInstance.canopyRadius ?? 0,
  };

  // Shadow and growth calculation
  const shadowData = useShadow([sceneObject], sunDirection ?? null);
  const grownPlant = useGrowPlant([sceneObject], shadowData, { simulateMidnight: true })[0];

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
  const lightIntensity = Math.max(0, Math.min(1, elevation / 90));
  const gradientAngle = (450 - azimuth) % 360;

  const shadowDistance = (1 - lightIntensity) * 15;
  const shadowX = Math.cos((azimuth * Math.PI) / 180) * shadowDistance;
  const shadowY = Math.sin((azimuth * Math.PI) / 180) * shadowDistance;
  const shadowBlur = 15 * (1 - lightIntensity) + 5;
  const shadowColor = `rgba(0,0,0,${0.3 * (1 - lightIntensity)})`;

  return (
    <div
      className="plant-wrapper"
      ref={ref}
      style={{
        position: "absolute",
        top: plantInstance.y,
        left: plantInstance.x,
        opacity: isDraggingPlant ? 0.5 : 1,
        cursor: "move",
        width: 40,
        height: 40,
      }}
    >
      <img
        src={imageSrc}
        alt={plantInstance.basePlant.name}
        title={`${plantInstance.basePlant.name} (${grownPlant?.height?.toFixed(1)}h)`}
        style={{
          width: 40,
          height: 40,
          filter: `brightness(${0.6 + lightIntensity * 0.8})`,
          boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`,
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
          background: `linear-gradient(${gradientAngle}deg, rgba(255,255,200,${0.3 * lightIntensity}) 0%, transparent 70%)`,
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
