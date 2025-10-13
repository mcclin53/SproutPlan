import { useDrag } from "react-dnd";
import { useCallback } from "react";

interface UseDragPlantProps {
  plantInstanceId: string;
  bedId: string;
  movePlantInBed: (bedId: string, plantId: string, newX: number, newY: number) => void;
  getPlantCoordinates: (bedId: string, plantId: string) => { x: number; y: number } | undefined;
}

export default function useDragPlant({
  plantInstanceId,
  bedId,
  movePlantInBed,
  getPlantCoordinates,
}: UseDragPlantProps) {
  const [{ isDraggingPlant }, drag] = useDrag(() => ({
    type: "PLANT_INSTANCE",
    item: { plantInstanceId, bedId, type: "PLANT_INSTANCE" },
    collect: (monitor) => ({
      isDraggingPlant: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      const coords = getPlantCoordinates(bedId, plantInstanceId);
      if (!coords) return;

      const newX = Math.max(0, Math.round(coords.x + delta.x));
      const newY = Math.max(0, Math.round(coords.y + delta.y));

      movePlantInBed(bedId, plantInstanceId, newX, newY);
    },
  }));

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (node) drag(node);
    },
    [drag]
  );

  return { ref, isDraggingPlant };
}
