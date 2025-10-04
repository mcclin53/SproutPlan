import { useQuery, useMutation } from "@apollo/client";
import { GET_BEDS } from "../utils/queries";
import { ADD_PLANTS_TO_BED, REMOVE_BED, CLEAR_BEDS } from "../utils/mutations";
import DigBed from "./DigBed";
import PlantSelector from "./SelectPlant";
import { useState } from "react";

export default function Garden() {
  const { loading, error, data, refetch } = useQuery(GET_BEDS);
  console.log(data.beds);
  const [addPlantsToBed] = useMutation(ADD_PLANTS_TO_BED, { onCompleted: () => refetch() });
  const [removeBed] = useMutation(REMOVE_BED, { refetchQueries: [{ query: GET_BEDS }] });
  const [clearBeds] = useMutation(CLEAR_BEDS, { refetchQueries: [{ query: GET_BEDS }] });

  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);

  if (loading) return <p>Loading beds...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const handleAddPlants = async () => {
    if (!selectedBed || selectedPlants.length === 0) return;
    await addPlantsToBed({ variables: { bedId: selectedBed, plants: selectedPlants } });
    setSelectedPlants([]);
    setSelectedBed(null);
  };

  return (
    <div>
      <DigBed onBedCreated={() => refetch()} />
      <div className="garden">
        {data.beds.map((bed: any) => (
          <div
            key={bed._id}
            className="bed-box"
            style={{
                width: `${bed.width * 50}px`,   // 50px per unit
                height: `${bed.length * 50}px`,
            }}
            >
            {bed.plants.length > 0 ? (
                <ul className="plant-list">
                {bed.plants.map((plant, i) => (
                    <li key={i}>{plant}</li>
                ))}
                </ul>
            ) : (
                <p>No plants yet</p>
            )}
            <div>
                <button  className="button" onClick={() => removeBed({ variables: { bedId: bed._id } })}>
                Remove Bed
                </button>
            </div>
            </div>
        ))}
      </div>

      {data.beds.length > 0 && (
        <button className="button" onClick={() => clearBeds()}>
          Clear All Beds
        </button>
      )}
    </div>
  );
}
