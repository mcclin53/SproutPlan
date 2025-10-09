import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@apollo/client";
import { MOVE_BED } from "../utils/mutations";
import { gql } from "@apollo/client";

export interface DragBed {
  _id: string;
  width: number;
  length: number;
  x: number;
  y: number;
  plantInstances?: any[];
}

const GRID_SIZE = 50;

export default function useDragBed(initialBeds: DragBed[]) {
  const [beds, setBeds] = useState<DragBed[]>(() => {
    const saved = localStorage.getItem("bedPositions");
    const savedPositions = saved ? JSON.parse(saved) : {};
    return initialBeds.map(b => ({
      ...b,
      x: typeof b.x === "number" ? b.x : (savedPositions[b._id]?.x ?? 0),
      y: typeof b.y === "number" ? b.y : (savedPositions[b._id]?.y ?? 0)
    }));
  });

  const [moveBedMutation] = useMutation(MOVE_BED);
  // Persist to MongoDB and update local state
  const moveBed = useCallback(
    (bedId: string, deltaX: number, deltaY: number) => {
      setBeds(prevBeds => {
        return prevBeds.map(bed => {
          if (bed._id !== bedId) return bed;

          const newX = Math.round((bed.x + deltaX) / GRID_SIZE) * GRID_SIZE;
          const newY = Math.round((bed.y + deltaY) / GRID_SIZE) * GRID_SIZE;

          if (Number.isNaN(newX) || Number.isNaN(newY)) {
            console.error("Invalid coordinates for moveBed:", newX, newY);
            return;
          }

          // Fire-and-forget async mutation (don’t block UI)
          moveBedMutation({
            variables: {
              bedId,
              position: { x: newX, y: newY },
            },
          optimisticResponse: {
            moveBed: { __typename: "Bed", _id: bedId, x: newX, y: newY }
          },
          update: (cache, { data }) => {
            // Write the new x/y into the existing Bed entry
            try {
              cache.writeFragment({
                id: cache.identify({ __typename: "Bed", _id: bedId }),
                fragment: gql`
                  fragment BedPos on Bed { x y }
                `,
                data: { x: newX, y: newY }
              });
            } catch (e) {}
            }
          }).catch(err => console.error("Failed to move bed:", err));

          return { ...bed, x: newX, y: newY };
        });
      });
    },
    [moveBedMutation]
  );

  // ✅ Save to localStorage whenever beds change
  useEffect(() => {
    const positions = beds.reduce((acc, bed) => {
      acc[bed._id] = { x: bed.x, y: bed.y };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);

    localStorage.setItem("bedPositions", JSON.stringify(positions));
  }, [beds]);

  // Optional helper
  const setBedPosition = useCallback((bedId: string, x: number, y: number) => {
    setBeds(prev => prev.map(bed => (bed._id === bedId ? { ...bed, x, y } : bed)));
  }, []);

  return { beds, setBeds, moveBed, setBedPosition };
}
