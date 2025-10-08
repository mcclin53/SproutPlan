import { useQuery } from "@apollo/client";
import { useState, useEffect } from "react";
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

export default function Garden() {
  const { loading: bedsLoading, error: bedsError, data: bedsData } = useQuery(GET_BEDS);
  const { loading: plantsLoading, error: plantsError, data: plantsData } = useQuery(GET_PLANTS);

  const addPlantsToBed = useAddPlantsToBed();
  const clearBeds = useClearBeds();
  const removeLocalBed = (bedId: string) => {
    setDragBeds(prev => prev.filter(b => b._id !== bedId));
  };
  const removeBed = useRemoveBed(removeLocalBed);
  const [dragBeds, setDragBeds] = useState<DragBed[]>([]);

  // Update draggable beds whenever bedsData changes
useEffect(() => {
  if (!bedsData?.beds?.length) return;

  const GRID_SIZE = 50; // same as your bed size unit
  const PADDING = 20;   // some space between beds

  setDragBeds(prevDragBeds => {
    const existingIds = prevDragBeds.map(b => b._id);
    const newBeds = bedsData.beds
      .filter(b => !existingIds.includes(b._id))
      .map((bed: any) => {
        // Try to find an empty spot
        let x = PADDING;
        let y = PADDING;

        // Keep moving right and down until we find a spot that doesn't overlap
        while (
          prevDragBeds.some(
            b =>
              x < b.x + b.width * GRID_SIZE + PADDING &&
              x + bed.width * GRID_SIZE + PADDING > b.x &&
              y < b.y + b.length * GRID_SIZE + PADDING &&
              y + bed.length * GRID_SIZE + PADDING > b.y
          )
        ) {
          x += GRID_SIZE * bed.width + PADDING;
          if (x + bed.width * GRID_SIZE > window.innerWidth - PADDING) {
            x = PADDING;
            y += GRID_SIZE * bed.length + PADDING;
          }
        }

        return {
          ...bed,
          x,
          y,
        };
      });

    return [...prevDragBeds, ...newBeds];
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
  key={bed._id}
  bed={bed}
  onDropPlant={(bedId, plantId) =>
    addPlantsToBed(bedId, [plantId], (updatedBed) => {
      setDragBeds(prev =>
        prev.map(b => (b._id === updatedBed._id ? { ...b, plantInstances: updatedBed.plantInstances } : b))
      );
    })
  }
  onRemoveBed={() => removeBed(bed._id)}
  moveBed={moveBed}
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
