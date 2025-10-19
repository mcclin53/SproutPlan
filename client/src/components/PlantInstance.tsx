import React, { useState } from "react";
import useDragPlant from "../hooks/useDragPlant";

interface BasePlant {
  _id: string;
  name: string;
  image?: string;
  waterReq?: string;
  spacing?: number;
}

interface PlantInstance {
  _id: string;
  basePlant: BasePlant;
  x: number;
  y: number;
}

interface Props {
  plantInstance: PlantInstance;
  bedId: string;
  movePlantInBed: (bedId: string, plantId: string, newX: number, newY: number) => void;
  getPlantCoordinates: (bedId: string, plantId: string) => { x: number; y: number } | undefined;
  handleRemovePlant: (bedId: string, plantInstanceId: string) => void; // Pass down from Garden.tsx
  sunlightHours?: number;
  sunDirection?: { azimuth: number; elevation: number } | null;
}

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export default function PlantInstanceComponent({
  plantInstance,
  bedId,
  movePlantInBed,
  getPlantCoordinates,
  handleRemovePlant,
  sunlightHours = 0,
  sunDirection,

}: Props) {

  console.log(`${plantInstance.basePlant.name} receives ${sunlightHours}h sunlight`);
  const [failedImages, setFailedImages] = useState(false);

  const { ref, isDraggingPlant } = useDragPlant({
    plantInstanceId: plantInstance._id,
    bedId,
    movePlantInBed,
    getPlantCoordinates,
  });

  const imgField = plantInstance.basePlant.image;
  const remote =
    imgField && imgField.startsWith("/")
      ? `${BASE_URL}${imgField}`
      : imgField
      ? `${BASE_URL}/images/${imgField}`
      : `${BASE_URL}/images/placeholder.png`;
  const imageSrc = failedImages ? `${BASE_URL}/images/placeholder.png` : remote;

  const azimuth = sunDirection?.azimuth ?? 180; // Default: south
  const elevation = sunDirection?.elevation ?? 45; // Default: mid-sky
  const lightIntensity = Math.max(0, Math.min(1, elevation / 90)); // normalize 0–1
  const gradientAngle = (450 - azimuth) % 360;// Convert azimuth to CSS gradient angle

  const shadowDistance = (1 - lightIntensity) * 15; // lower sun = longer shadow
  const shadowX = Math.cos((azimuth * Math.PI) / 180) * shadowDistance;
  const shadowY = Math.sin((azimuth * Math.PI) / 180) * shadowDistance;
  const shadowBlur = 15 * (1 - lightIntensity) + 5; // blur varies with sun height
  const shadowColor = `rgba(0,0,0,${0.3 * (1 - lightIntensity)})`;

  // const lightStyle: React.CSSProperties = {
  //   filter: `brightness(${0.6 + lightIntensity * 0.8})`,
  //   background: `
  //     linear-gradient(${gradientAngle}deg, rgba(255,255,200,${0.3 * lightIntensity}) 0%, transparent 70%)
  //   `,
  //   boxShadow: `
  //     ${Math.cos((azimuth * Math.PI) / 180) * 10}px 
  //     ${Math.sin((azimuth * Math.PI) / 180) * 10}px 
  //     20px rgba(255, 255, 150, ${0.3 * lightIntensity})
  //   `,
  //   borderRadius: "50%",
  //   transition: "all 0.5s ease-in-out",
  // };

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
        title={plantInstance.basePlant.name}
        style={{ 
          width: 40, 
          height: 40, 
          filter: `brightness(${0.6 + lightIntensity * 0.8})`,
          boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`,
          transition: "filter 0.5s ease-in-out",
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
        onClick={() => handleRemovePlant(bedId, plantInstance._id)} // Use parent handler
      >
        ❌
      </button>
    </div>
  );
}
