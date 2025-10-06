import { useQuery, useMutation } from "@apollo/client";
import { GET_BEDS } from "../utils/queries";
import { ADD_PLANTS_TO_BED, REMOVE_BED, CLEAR_BEDS } from "../utils/mutations";
import DigBed from "./DigBed";
// import PlantSelector from "./SelectPlant";
// import { useState } from "react";
import Bed from "./Bed";
import Plant from "./Plant";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const PLANTS = ["Tomato", "Carrot", "Lettuce", "Pepper", "Cucumber"];

export default function Garden() {
  const { loading, error, data, refetch } = useQuery(GET_BEDS);
  const [addPlantsToBed] = useMutation(ADD_PLANTS_TO_BED, { onCompleted: () => refetch() });
  const [removeBed] = useMutation(REMOVE_BED, { refetchQueries: [{ query: GET_BEDS }] });
  const [clearBeds] = useMutation(CLEAR_BEDS, { refetchQueries: [{ query: GET_BEDS }] });

   if (loading) return <p>Loading beds...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleDropPlant = async (bedId: string, plantName: string) => {
    await addPlantsToBed({ variables: { bedId, plants: [plantName] } });
  };

  return (
    <div>
      {/* Bed creation form */}
      <DigBed onBedCreated={() => refetch()} />

      {/* Drag-and-drop garden */}
      <DndProvider backend={HTML5Backend}>
        <div className="garden">
          {data.beds.map((bed: any) => (
            <Bed
              key={bed._id}
              bed={bed}
              onDropPlant={handleDropPlant}
              onRemoveBed={() => removeBed({ variables: { bedId: bed._id } })}
            />
          ))}
        </div>

        {/* Plant palette for dragging */}
        <div className="plant-palette">
          <h3>Available Plants</h3>
          {PLANTS.map((plant) => (
            <Plant key={plant} name={plant} />
          ))}
        </div>
      </DndProvider>

      {/* Clear all beds button */}
      {data.beds.length > 0 && (
        <button className="button clear-beds" onClick={() => clearBeds()}>
          Clear All Beds
        </button>
      )}
    </div>
  );
}