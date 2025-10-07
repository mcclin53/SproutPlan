import { useDrop } from "react-dnd";
import useRemovePlantsFromBed from "../hooks/useRemovePlantsFromBed";

interface BasePlant {
  _id: string;
  name: string;
  image?: string;
  waterReq?: string;
  spacing?: number;
}

interface PlantInstance {
  _id: string;
  basePlant: BasePlant;
}

interface BedProps {
  bed: {
    _id: string;
    width: number;
    length: number;
    plantInstances?: PlantInstance[];
  };
  onDropPlant: (bedId: string, plantInstanceId: string) => void;
  onRemoveBed: () => void;
}

export default function Bed({ bed, onDropPlant, onRemoveBed }: BedProps) {
  const removePlantsFromBed = useRemovePlantsFromBed();

  const [, drop] = useDrop(() => ({
    accept: "PLANT",
    drop: (item: { id: string; name: string }) => {
      onDropPlant(bed._id, item.id);
    },
  }));

  const handleRemovePlant = (plantInstanceId: string) => {
    removePlantsFromBed(bed._id, [plantInstanceId]);
  };

  const plantInstances = bed?.plantInstances || [];

  return (
    <div
      ref={drop}
      className="bed-box"
      style={{
        width: `${bed.width * 50}px`,
        height: `${bed.length * 50}px`,
        position: "relative",
      }}
    >
      {plantInstances.length > 0 ? (
        <ul className="plant-list">
          {plantInstances.map((plantInstance) => {
            const imageSrc = plantInstance.basePlant.image
              ? `/images/${plantInstance.basePlant.image}`
              : "/images/placeholder.png";

            return (
              <li key={plantInstance._id} style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={imageSrc}
                  alt={plantInstance.basePlant.name}
                  title={plantInstance.basePlant.name}
                  style={{ width: 40, height: 40 }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== "/images/placeholder.png") {
                      target.src = "/images/placeholder.png";
                    }
                  }}
                />
                <button
                  className="button"
                  style={{
                    background: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    marginLeft: "5px",
                  }}
                  onClick={() => handleRemovePlant(plantInstance._id)}
                >
                  ❌
                </button>
              </li>
            );
          })}
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
