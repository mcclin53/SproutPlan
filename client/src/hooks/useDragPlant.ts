import { useDrag, useDrop } from "react-dnd";
import { useCallback } from "react";

interface UseDragPlantProps {
  plantInstanceId: string;
  x: number;
  y: number;
  bedId: string;
  movePlantInBed: (bedId: string, plantInstanceId: string, x: number, y: number) => void;
}

export default function useDragPlant({ plantInstanceId, x, y, bedId, movePlantInBed }: UseDragPlantProps) {
  const [, drop] = useDrop(() => ({
    accept: "PLANT_INSTANCE",
    drop: (item: any, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;

      const newX = Math.max(0, Math.round(item.x + delta.x));
      const newY = Math.max(0, Math.round(item.y + delta.y));

      movePlantInBed(bedId, plantInstanceId, newX, newY);
    },
  }));

  const [{ isDraggingPlant }, drag] = useDrag(() => ({
    type: "PLANT_INSTANCE",
    item: { plantInstanceId, x, y },
    collect: (monitor) => ({ isDraggingPlant: monitor.isDragging() }),
  }));

  // Combine refs
  const ref = useCallback(
    (node: HTMLElement | null) => {
      drag(drop(node));
    },
    [drag, drop]
  );

  return { ref, isDraggingPlant };
}