import { useQuery, useMutation } from "@apollo/client";
import { useState, useEffect, useCallback } from "react";
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

export default function Garden() {
  const { loading: bedsLoading, error: bedsError, data: bedsData } = useQuery(GET_BEDS);
  const { loading: plantsLoading, error: plantsError, data: plantsData } = useQuery(GET_PLANTS);
  console.log("Fetched plants:", plantsData?.plants);
  const addPlantsToBed = useAddPlantsToBed();
  const clearBeds = useClearBeds();
  const removeLocalBed = (bedId: string) => {
    setDragBeds(prev => prev.filter(b => b._id !== bedId));
  };
  const removeBed = useRemoveBed(removeLocalBed);
  const [dragBeds, setDragBeds] = useState<DragBed[]>([]);
  const [movePlantInBedMutation] = useMutation(MOVE_PLANT_IN_BED);

  const movePlantInBed = (bedId: string, plantId: string, newX: number, newY: number) => {
    console.log(`movePlantInBed called for plant ${plantId} in bed ${bedId} -> x:${newX}, y:${newY}`);
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

  const getPlantCoordinates = useCallback((bedId: string, plantId: string) => {
  const targetBed = dragBeds.find(b => b._id === bedId);
  const plant = targetBed?.plantInstances?.find(p => p._id === plantId);
  return plant ? { x: plant.x ?? 0, y: plant.y ?? 0 } : undefined;
}, [dragBeds]);

  // Update draggable beds whenever bedsData changes
  useEffect(() => {
    if (!bedsData?.beds?.length) return;

    const GRID_SIZE = 50; // same as your bed size unit
    const PADDING = 20;   // some space between beds

  setDragBeds(prevDragBeds => {
    const prevMap = new Map(prevDragBeds.map(b => [b._id, b]));
    const placed: DragBed[] = [];

    for (const bed of bedsData.beds) {
      // If server provided coordinates, use them (server is authoritative)
      if (typeof bed.x === "number" && typeof bed.y === "number") {
        placed.push({ ...bed });
        continue;
      }

      // If we already have a local position for this bed, reuse it
      const local = prevMap.get(bed._id);
      if (local) {
        // keep x/y from local but merge other fields from server
        placed.push({ ...local, ...bed });
        continue;
      }

      // 3) Otherwise compute a new, non-overlapping spot
      let x = PADDING;
      let y = PADDING;

      const overlaps = (x: number, y: number, w: number, l: number) =>
        [...prevDragBeds, ...placed].some(
          (b) =>
            x < b.x + b.width * GRID_SIZE + PADDING &&
            x + w * GRID_SIZE + PADDING > b.x &&
            y < b.y + b.length * GRID_SIZE + PADDING &&
            y + l * GRID_SIZE + PADDING > b.y
        );

      while (overlaps(x, y, bed.width, bed.length)) {
        x += GRID_SIZE * bed.width + PADDING;
        if (x + bed.width * GRID_SIZE > window.innerWidth - PADDING) {
          x = PADDING;
          y += GRID_SIZE * bed.length + PADDING;
        }
      }

      placed.push({ ...bed, x, y });
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
            <Plant key={plant._id ? plant._id : `fallback-${index}`} plant={plant} />
          ))}
        </div>

        {/* Garden beds */}
        <div className="garden" style={{ position: "relative", width: "100%", height: "100%" }}>
          {beds.map((bed) => (
            <Bed
              key={bed._id + (bed.plantInstances?.length ?? 0)}
              bed={bed}
              onDropPlant={(bedId, plantId) => {
                const basePlant = plantsData?.plants?.find(p => p._id === plantId);

                addPlantsToBed(bedId, [plantId], (updatedBed) => {
                  console.log("Updated bed from mutation:", updatedBed);

                  setDragBeds(prev =>
                    prev.map(b =>
                      b._id === updatedBed._id
                        ? { ...b, plantInstances: updatedBed.plantInstances }
                        : b
                    )
                  );
                });
              }}
              onRemoveBed={() => removeBed(bed._id)}
              moveBed={moveBed}
              movePlantInBed={movePlantInBed}
              getPlantCoordinates={getPlantCoordinates}
            />
          ))}
        </div>
      </DndProvider>

      {/* Clear all beds button */}
      {beds.length > 0 && (
        <button className="button clear-beds" onClick={async () => {
      await clearBeds();      // run mutation & clear Apollo cache
      setDragBeds([]);        // clear local draggable beds
    }}>
          Clear All Beds
        </button>
      )}
    </div>
  );
}
