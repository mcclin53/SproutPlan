import React, { useState, useEffect } from "react";
import { useDrop, useDrag } from "react-dnd";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";
import { useMutation, gql } from "@apollo/client";
import useDragPlant from "../hooks/useDragPlant";
import PlantInstanceComponent from "./PlantInstance";

interface BedProps {
  bed: {
    _id: string;
    width: number;
    length: number;
    plantInstances?: any[];
    x: number;
    y: number;
  };
  onDropPlant: (bedId: string, plantInstanceId: string) => void;
  onRemoveBed: () => void;
  moveBed?: (bedId: string, deltaX: number, deltaY: number) => void;
  movePlantInBed: (bedId: string, plantId: string, newX: number, newY: number) => void;
  getPlantCoordinates: (bedId: string, plantId: string) => { x: number; y: number } | undefined;
}

const MOVE_PLANT_IN_BED = gql`
  mutation MovePlantInBed($bedId: ID!, $position: PlantPositionInput!) {
    movePlantInBed(bedId: $bedId, position: $position) {
      _id
      plantInstances {
        _id
        x
        y
        basePlant {
          _id
          name
          image
          waterReq
          spacing
        }
      }
    }
  }
`;

export default function Bed({ bed, onDropPlant, onRemoveBed, moveBed, movePlantInBed, getPlantCoordinates }: BedProps) {
  
  const [movePlantInBedMutation] = useMutation(MOVE_PLANT_IN_BED);

  // Plant drop
const [, drop] = useDrop(() => ({
  accept: ["PLANT", "PLANT_INSTANCE"],
  drop: (item: any, monitor) => {
    const delta = monitor.getDifferenceFromInitialOffset();
    if (!delta) return;
    console.log("Dropped item:", item);

    if (item.type === "PLANT_INSTANCE") {
    const coords = getPlantCoordinates(bed._id, item.plantInstanceId);
      if (!coords) {
        console.error("❌ Plant not found in bed!", {
          bedId: bed._id,
          plantInstanceId: item.plantInstanceId,
        });
        return;
      }
  
      const newX = Math.max(0, Math.round(coords.x + delta.x));
      const newY = Math.max(0, Math.round(coords.y + delta.y));

      console.log("Moving plant", item.plantInstanceId,"from", coords,"to", { x: newX, y: newY },"Δ", delta);

      movePlantInBed(bed._id, item.plantInstanceId, newX, newY);
      return;
    }

    // Drop new plant
    const itemType = monitor.getItemType();
    if (item.type === "PLANT") {
      console.log("🪴 Dropping new plant:", item);
    onDropPlant(bed._id, item.id);
    }
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
  
  const plantInstances = bed?.plantInstances || [];

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
      <div
        className="bed-inner"
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
      {plantInstances.length > 0 ? (
        plantInstances.map((plantInstance) => (
          <PlantInstanceComponent
            key={plantInstance._id}
            plantInstance={plantInstance}
            bedId={bed._id}
            movePlantInBed={movePlantInBed}
            getPlantCoordinates={getPlantCoordinates}
          />
        ))
      ) : (
        <p>No plants yet</p>
      )}
      </div>

      <div className="bed-buttons">
        <button className="button" onClick={onRemoveBed}>
          Remove Bed
        </button>
      </div>
    </div>
  );
}
