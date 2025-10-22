import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDrop, useDrag } from "react-dnd";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";
import { useMutation, gql } from "@apollo/client";
import useDragPlant from "../hooks/useDragPlant";
import PlantInstanceComponent from "./PlantInstance";
import { MOVE_PLANT_IN_BED } from "../utils/mutations";
import { motion } from "framer-motion";

interface BedProps {
  bed: {
    _id: string;
    width: number;
    length: number;
    plantInstances?: any[];
    x: number;
    y: number;
    
  };
  onAddBasePlantsToBed: ( bedId: string, basePlantIds: string[], positions: { x: number; y: number }[], onUpdate?: (updatedBed: any) => void) => void;
  // onDropPlant: (bedId: string, plantInstanceId: string, positions: { x: number, y: number}[], onUpdate?: (updatedBed: any) => void) => void;
  onRemoveBed: () => void;
  moveBed?: (bedId: string, deltaX: number, deltaY: number) => void;
  movePlantInBed: (bedId: string, plantId: string, newX: number, newY: number) => void;
  getPlantCoordinates: (bedId: string, plantId: string) => { x: number; y: number } | undefined;
  handleRemovePlant: (bedId: string, plantInstanceId: string) => void;
  sunDirection?: { elevation: number; azimuth: number } | null;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        // @ts-ignore
        ref.current = node;
      }
    });
  };
}

export default function Bed({ bed, onAddBasePlantsToBed, onRemoveBed, moveBed, movePlantInBed, getPlantCoordinates, handleRemovePlant, sunDirection }: BedProps) {
  const dropRef = useRef<HTMLDivElement>(null)
  const [movePlantInBedMutation] = useMutation(MOVE_PLANT_IN_BED);

  // Dropping 
const [, drop] = useDrop(() => ({
  accept: ["BASE_PLANT"],
  drop: (item: any, monitor) => {
    const clientOffset = monitor.getClientOffset();
    const dropTargetRect = dropRef.current?.getBoundingClientRect();

    if (!clientOffset || !dropTargetRect) return;

    // Drop new base plant
    if (item.type === "BASE_PLANT") {
      const x = Math.round(clientOffset.x - dropTargetRect.left - (item.offsetX || 20));
      const y = Math.round(clientOffset.y - dropTargetRect.top - (item.offsetY || 20));

      onAddBasePlantsToBed(bed._id, [item.id], [{ x, y }]);
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
      ref={mergeRefs(drag, drop, dropRef)}
      id={`bed-${bed._id}`}
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
            handleRemovePlant={handleRemovePlant}
            sunlightHours={plantInstance.sunlightHours || 0}
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
