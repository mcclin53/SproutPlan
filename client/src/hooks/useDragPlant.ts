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
    item: { plantInstanceId, bedId },
    collect: (monitor) => ({
      isDraggingPlant: monitor.isDragging(),
    }),
    end: (_, monitor) => {
      const clientOffset = monitor.getClientOffset();
      const bedElement = document.getElementById(`bed-${bedId}`);
      if (!clientOffset || !bedElement) return;

      const bedRect = bedElement.getBoundingClientRect();
      const coords = getPlantCoordinates(bedId, plantInstanceId);
      if (!coords) return;

      // Compute new position relative to bed
      const newX = clientOffset.x - bedRect.left - 20; // 20 = half plant width if needed
      const newY = clientOffset.y - bedRect.top - 20;

      movePlantInBed(bedId, plantInstanceId, Math.max(0, Math.round(newX)), Math.max(0, Math.round(newY)));
    },
  }));

  const ref = useCallback((node: HTMLElement | null) => {
    if (node) drag(node);
  }, [drag]);

  return { ref, isDraggingPlant };
}
