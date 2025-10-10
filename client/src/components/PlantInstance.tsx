import React from "react";
import { useState,useEffect } from "react";
import useDragPlant from "../hooks/useDragPlant";
import  useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";

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
}

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

export default function PlantInstanceComponent({ plantInstance, bedId, movePlantInBed }: Props) {
    const removePlantsFromBed = useRemovePlantsFromBed();

    const [failedImages, setFailedImages] = useState(false);
  
    const { ref, isDraggingPlant } = useDragPlant({
        plantInstanceId: plantInstance._id,
        x: plantInstance.x,
        y: plantInstance.y,
        bedId,
        movePlantInBed
    });

    const imgField = plantInstance.basePlant.image;
    const remote =
        imgField && imgField.startsWith("/")
        ? `${BASE_URL}${imgField}`
        : imgField
        ? `${BASE_URL}/images/${imgField}`
        : `${BASE_URL}/images/placeholder.png`;
    const imageSrc = failedImages ? `${BASE_URL}/images/placeholder.png` : remote;

    const handleRemovePlant = (plantInstanceId: string) => {
        removePlantsFromBed(bedId, [plantInstanceId]);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: plantInstance.y,
        left: plantInstance.x,
        opacity: isDraggingPlant ? 0.5 : 1,
        cursor: "move",
      }}
    >
        <img
            src={imageSrc}
            alt={plantInstance.basePlant.name}
            title={plantInstance.basePlant.name}
            style={{ width: 40, height: 40 }}
            onError={(e) => {
                setFailedImages(true );
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith("/images/placeholder.png")) {
                target.src = `${BASE_URL}/images/placeholder.png`;
                }
            }}
        />
        <button
            className="button"
            style={{
                background: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "2px 6px",
                cursor: "pointer",
                fontSize: "0.8rem",
                marginLeft: "5px",
            }}
            onClick={() => handleRemovePlant(plantInstance._id)}
        >
            ❌
        </button>
    </div>
  );
}