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
}

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export default function PlantInstanceComponent({
  plantInstance,
  bedId,
  movePlantInBed,
  getPlantCoordinates,
  handleRemovePlant,
}: Props) {
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
        style={{ width: 40, height: 40 }}
        onError={(e) => {
          setFailedImages(true);
          const target = e.target as HTMLImageElement;
          if (!target.src.endsWith("/images/placeholder.png")) {
            target.src = `${BASE_URL}/images/placeholder.png`;
          }
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
