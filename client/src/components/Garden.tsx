import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_BEDS, GET_PLANTS } from "../utils/queries";
import DigBed from "./DigBed";
import Bed from "./Bed";
import Plant from "./Plant";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import useAddPlantsToBed from "../hooks/useAddPlantsToBed";
import useRemoveBed from "../hooks/useRemoveBed";
import useClearBeds from "../hooks/useClearBeds";
import useDragBed from "../hooks/useDragBed";
import type { DragBed } from "../hooks/useDragBed";
import { MOVE_PLANT_IN_BED } from "../utils/mutations";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";

export default function Garden() {
  const { loading: bedsLoading, error: bedsError, data: bedsData } = useQuery(GET_BEDS);
  const { loading: plantsLoading, error: plantsError, data: plantsData } = useQuery(GET_PLANTS);

  const addPlantsToBed = useAddPlantsToBed();
  const clearBeds = useClearBeds();
  const removePlantsFromBed = useRemovePlantsFromBed();
  const [dragBeds, setDragBeds] = useState<DragBed[]>([]);
  const [movePlantInBedMutation] = useMutation(MOVE_PLANT_IN_BED);

  const removeLocalBed = (bedId: string) => {
    setDragBeds(prev => prev.filter(b => b._id !== bedId));
  };
  const removeBed = useRemoveBed(removeLocalBed);

  const handleRemovePlant = async (bedId: string, plantInstanceId: string) => {
    // Optimistically remove the plant locally
    setDragBeds(prev =>
      prev.map(bed => {
        if (bed._id !== bedId) return bed;
        return {
          ...bed,
          plantInstances: bed.plantInstances?.filter(p => p._id !== plantInstanceId) || [],
        };
      })
    );

    try {
      const updatedBed = await removePlantsFromBed(bedId, [plantInstanceId]);

      // Merge remaining plant positions from previous state
      setDragBeds(prev =>
        prev.map(b => {
          if (b._id !== updatedBed._id) return b;
          const mergedPlantInstances = updatedBed.plantInstances.map(p => {
            const localPlant = b.plantInstances?.find(lp => lp._id === p._id);
            return localPlant ? { ...p, x: localPlant.x, y: localPlant.y } : p;
          });
          return { ...b, plantInstances: mergedPlantInstances };
        })
      );
    } catch (err) {
      console.error("Error removing plant from bed:", err);
    }
  };

  const movePlantInBed = (bedId: string, plantId: string, newX: number, newY: number) => {
    // Update local state immediately
    setDragBeds(prev =>
      prev.map(bed =>
        bed._id === bedId
          ? {
              ...bed,
              plantInstances: (bed.plantInstances || []).map(p =>
                p._id === plantId ? { ...p, x: newX, y: newY } : p
              ),
            }
          : bed
      )
    );

    // Fire-and-forget mutation to server
    movePlantInBedMutation({
      variables: { bedId, position: { plantInstanceId: plantId, x: newX, y: newY } },
    }).catch(err => console.error(err));
  };

  const getPlantCoordinates = useCallback(
    (bedId: string, plantId: string) => {
      const targetBed = dragBeds.find(b => b._id === bedId);
      const plant = targetBed?.plantInstances?.find(p => p._id === plantId);
      return plant ? { x: plant.x ?? 0, y: plant.y ?? 0 } : undefined;
    },
    [dragBeds]
  );

  // Update draggable beds whenever bedsData changes
  useEffect(() => {
    if (!bedsData?.beds?.length) return;

    const GRID_SIZE = 50;
    const PADDING = 20;

    setDragBeds(prevDragBeds => {
      const prevMap = new Map(prevDragBeds.map(b => [b._id, b]));
      const placed: DragBed[] = [];

      for (const bed of bedsData.beds) {
        const localBed = prevMap.get(bed._id);
        const serverPlantInstances = bed.plantInstances || [];

        // Merge local positions for plants that still exist
        const mergedPlantInstances = bed.plantInstances.map(sp => {
          const localPlant = localBed?.plantInstances?.find(lp => lp._id === sp._id);
          return {
            ...sp,
            x: localPlant?.x ?? sp.x ?? 0,
            y: localPlant?.y ?? sp.y ?? 0,
          };
        });

        let x = typeof bed.x === "number" ? bed.x : localBed?.x ?? PADDING;
        let y = typeof bed.y === "number" ? bed.y : localBed?.y ?? PADDING;

        // Compute non-overlapping spot if coordinates not provided
        const overlaps = (x: number, y: number, w: number, l: number) =>
          [...prevDragBeds, ...placed].some(
            b =>
              x < b.x + b.width * GRID_SIZE + PADDING &&
              x + w * GRID_SIZE + PADDING > b.x &&
              y < b.y + b.length * GRID_SIZE + PADDING &&
              y + l * GRID_SIZE + PADDING > b.y
          );

        if (typeof bed.x !== "number" || typeof bed.y !== "number") {
          while (overlaps(x, y, bed.width, bed.length)) {
            x += GRID_SIZE * bed.width + PADDING;
            if (x + bed.width * GRID_SIZE > window.innerWidth - PADDING) {
              x = PADDING;
              y += GRID_SIZE * bed.length + PADDING;
            }
          }
        }

        placed.push({ ...bed, x, y, plantInstances: mergedPlantInstances });
      }

      return placed;
    });
  }, [bedsData]);

  const { beds, moveBed, setBeds } = useDragBed(dragBeds);

  useEffect(() => {
    setBeds(dragBeds);
  }, [dragBeds]);

  if (bedsLoading || plantsLoading) return <p>Loading garden...</p>;
  if (bedsError) return <p>Error loading beds: {bedsError.message}</p>;
  if (plantsError) return <p>Error loading plants: {plantsError.message}</p>;

  const plantsToRender = plantsData.plants;

  return (
    <div>
      <DigBed />

      <DndProvider backend={HTML5Backend}>
        <div className="plant-palette">
          <h3>Select Plants</h3>
          {plantsToRender.map((plant: any, index: number) => (
            <Plant key={plant._id ?? `fallback-${index}`} plant={plant} />
          ))}
        </div>

        {/* Garden beds */}
        <div className="garden" style={{ position: "relative", width: "100%", height: "100%" }}>
          {beds.map(bed => (
            <Bed
              key={bed._id + (bed.plantInstances?.length ?? 0)}
              bed={bed}
              onDropPlant={(bedId, plantId, x, y) => {
                addPlantsToBed(bedId, [plantId], updatedBed => {
                  setDragBeds(prev =>
                    prev.map(b => {
                      if (b._id !== updatedBed._id) return b;
                      const mergedPlantInstances = updatedBed.plantInstances.map(sp => {
                        const localPlant = b.plantInstances?.find(lp => lp._id === sp._id);
                        return localPlant ? { ...sp, x: localPlant.x, y: localPlant.y } : { ...sp, x, y };
                      });
                      return { ...b, plantInstances: mergedPlantInstances };
                    })
                  );
                });
              }}
              onRemoveBed={() => removeBed(bed._id)}
              moveBed={moveBed}
              movePlantInBed={movePlantInBed}
              getPlantCoordinates={getPlantCoordinates}
              handleRemovePlant={handleRemovePlant}
            />
          ))}
        </div>
      </DndProvider>

      {/* Clear all beds button */}
      {beds.length > 0 && (
        <button
          className="button clear-beds"
          onClick={async () => {
            await clearBeds();
            setDragBeds([]);
          }}
        >
          Clear All Beds
        </button>
      )}
    </div>
  );
}
