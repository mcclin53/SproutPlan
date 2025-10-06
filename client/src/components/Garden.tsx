import { useQuery } from "@apollo/client";
import { GET_BEDS, GET_PLANTS } from "../utils/queries";
import DigBed from "./DigBed";
import Bed from "./Bed";
import Plant from "./Plant";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import useAddPlantsToBed from "../hooks/useAddPlantsToBed";
import useRemoveBed from "../hooks/useRemoveBed";
import useClearBeds from "../hooks/useClearBeds";

export default function Garden() {
  const { loading: bedsLoading, error: bedsError, data: bedsData } = useQuery(GET_BEDS);
  const { loading: plantsLoading, error: plantsError, data: plantsData } = useQuery(GET_PLANTS);

  const addPlantsToBed = useAddPlantsToBed();
  const removeBed = useRemoveBed();
  const clearBeds = useClearBeds();

  if (bedsLoading || plantsLoading) return <p>Loading garden...</p>;
  if (bedsError) return <p>Error loading beds: {bedsError.message}</p>;
  if (plantsError) return <p>Error loading plants: {plantsError.message}</p>;

  const plantsToRender = plantsData.plants;

  return (
    <div>
      {/* Bed creation form */}
      <DigBed />

      {/* Drag-and-drop garden */}
      <DndProvider backend={HTML5Backend}>
        
        {/* Plant palette for dragging */}
        <div className="plant-palette">
          <h3>Select Plants</h3>
          {plantsToRender.map((plant: any, index: number) => (
            <Plant key={plant._id ? plant._id : `fallback-${index}`} plant={plant} />
          ))}
        </div>
        
        {/* Garden beds */}
        <div className="garden">
          {bedsData.beds.map((bed: any) => (
            <Bed
              key={bed._id}
              bed={bed}
              onDropPlant={(bedId, plantId) => addPlantsToBed(bedId, [plantId])}
              onRemoveBed={() => removeBed(bed._id)}
            />
          ))}
        </div>
      </DndProvider>

      {/* Clear all beds button */}
      {bedsData.beds.length > 0 && (
        <button className="button clear-beds" onClick={clearBeds}>
          Clear All Beds
        </button>
      )}
    </div>
  );
}
