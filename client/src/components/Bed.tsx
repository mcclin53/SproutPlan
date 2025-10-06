import { useDrop } from "react-dnd";

interface PlantType {
  _id: string;
  name: string;
  image?: string;
  waterReq?: string;
  spacing?: number;
}

interface PlantInstance {
  _id: string;
  plantType: PlantType;
}

interface BedProps {
  bed: {
    _id: string;
    width: number;
    length: number;
    plants: PlantInstance[];
  };
  onDropPlant: (bedId: string, plantId: string) => void;
  onRemoveBed: () => void;
}

export default function Bed({ bed, onDropPlant, onRemoveBed }: BedProps) {
  const [, drop] = useDrop(() => ({
    accept: "PLANT",
    drop: (item: { id: string; name: string }) => {
      onDropPlant(bed._id, item.id);
    },
  }));

  return (
    <div
      ref={drop}
      className="bed-box"
      style={{
        width: `${bed.width * 50}px`,
        height: `${bed.length * 50}px`,
      }}
    >
      {bed.plants.length > 0 ? (
        <ul className="plant-list">
          {bed.plants.map((plantInstance, i) => (
            <li key={plantInstance._id}>{plantInstance.plantType.name}
              <img src={plantInstance.plantType.image} alt={plantInstance.plantType.name} style={{ width: 40, height: 40 }} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No plants yet</p>
      )}
    <div className="bed-buttons">
        <button className="button" onClick={onRemoveBed}>
          Remove Bed
        </button>
      </div>
    </div>
  );
}
