import React, { useState, useEffect } from "react";
import { useDrop, useDrag } from "react-dnd";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";

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
}

interface BedProps {
  bed: {
    _id: string;
    width: number;
    length: number;
    plantInstances?: PlantInstance[];
    x: number;
    y: number;
  };
  onDropPlant: (bedId: string, plantInstanceId: string) => void;
  onRemoveBed: () => void;
  moveBed?: (bedId: string, deltaX: number, deltaY: number) => void;
}

export default function Bed({ bed, onDropPlant, onRemoveBed, moveBed }: BedProps) {
  const removePlantsFromBed = useRemovePlantsFromBed();

  // Plant drop
  const [, drop] = useDrop(() => ({
    accept: "PLANT",
    drop: (item: { id: string; name: string }) => {
      onDropPlant(bed._id, item.id);
    },
  }));

  // Drag bed
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "BED",
    item: { id: bed._id, x: bed.x, y: bed.y },
    end: (item: any, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      moveBed?.(bed._id, delta.x, delta.y);
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleRemovePlant = (plantInstanceId: string) => {
    removePlantsFromBed(bed._id, [plantInstanceId]);
  };

  const plantInstances = bed?.plantInstances || [];

  // API base for images
  const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

  // Track failed images by plantInstance id
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFailedImages(prev => {
      const keep: Record<string, boolean> = {};
      plantInstances.forEach(pi => {
        if (prev[pi._id]) keep[pi._id] = true;
      });
      return keep;
    });
  }, [plantInstances.map(pi => pi._id).join(",")]);

  return (
    <div
      ref={(node) => { drag(node); drop(node); }}
      className="bed-box"
      style={{
        width: `${bed.width * 50}px`,
        height: `${bed.length * 50}px`,
        position: "absolute",
        top: `${bed.y}px`,
        left: `${bed.x}px`,
        opacity: isDragging ? 0.5 : 1,
        cursor: moveBed ? "move" : "default",
      }}
    >
      {plantInstances.length > 0 ? (
        <ul className="plant-list">
          {plantInstances.map((plantInstance) => {
            const imgField = plantInstance.basePlant.image;
            const remote =
              imgField && imgField.startsWith("/")
                ? `${BASE_URL}${imgField}`
                : imgField
                ? `${BASE_URL}/images/${imgField}`
                : `${BASE_URL}/images/placeholder.png`;

            const imageSrc = failedImages[plantInstance._id] ? `${BASE_URL}/images/placeholder.png` : remote;

            return (
              <li key={plantInstance._id} style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={imageSrc}
                  alt={plantInstance.basePlant.name}
                  title={plantInstance.basePlant.name}
                  style={{ width: 40, height: 40 }}
                  onError={(e) => {
                    const id = plantInstance._id;
                    setFailedImages(prev => (prev[id] ? prev : { ...prev, [id]: true }));
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
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No plants yet</p>
      )}

      <div className="bed-buttons">
        <button className="button" onClick={onRemoveBed}>
          Remove Bed
        </button>
      </div>
    </div>
  );
}
