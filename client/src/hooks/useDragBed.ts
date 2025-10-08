import { useState, useCallback, useEffect } from "react";

export interface DragBed {
  _id: string;
  width: number;
  length: number;
  x: number;
  y: number;
  plantInstances?: any[];
}

const GRID_SIZE = 50; // same as your bed unit size

export default function useDragBed(initialBeds: DragBed[]) {
  // ✅ Load any saved positions from localStorage when initializing
  const [beds, setBeds] = useState<DragBed[]>(() => {
    const saved = localStorage.getItem("bedPositions");
    if (saved) {
      const savedPositions: Record<string, { x: number; y: number }> = JSON.parse(saved);
      return initialBeds.map(bed => ({
        ...bed,
        x: savedPositions[bed._id]?.x ?? bed.x,
        y: savedPositions[bed._id]?.y ?? bed.y,
      }));
    }
    return initialBeds;
  });

  // ✅ Save positions to localStorage whenever beds change
  useEffect(() => {
    const positions = beds.reduce((acc, bed) => {
      acc[bed._id] = { x: bed.x, y: bed.y };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    localStorage.setItem("bedPositions", JSON.stringify(positions));
  }, [beds]);

  // ✅ Move bed (snaps to grid)
  const moveBed = useCallback((bedId: string, deltaX: number, deltaY: number) => {
    setBeds(prev =>
      prev.map(bed => {
        if (bed._id !== bedId) return bed;

        const newX = Math.round((bed.x + deltaX) / GRID_SIZE) * GRID_SIZE;
        const newY = Math.round((bed.y + deltaY) / GRID_SIZE) * GRID_SIZE;

        return { ...bed, x: newX, y: newY };
      })
    );
  }, []);

  // ✅ Directly set bed position (optional helper)
  const setBedPosition = useCallback((bedId: string, x: number, y: number) => {
    setBeds(prev =>
      prev.map(bed => (bed._id === bedId ? { ...bed, x, y } : bed))
    );
  }, []);

  return { beds, setBeds, moveBed, setBedPosition };
}
