import { useDrop } from "react-dnd";

interface BedProps {
  bed: any;
  onDropPlant: (bedId: string, plantName: string) => void;
  onRemoveBed: () => void;
}

export default function Bed({ bed, onDropPlant, onRemoveBed }: BedProps) {
  const [, drop] = useDrop(() => ({
    accept: "PLANT",
    drop: (item: { name: string }) => onDropPlant(bed._id, item.name),
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
          {bed.plants.map((plant: string, i: number) => (
            <li key={i}>{plant}</li>
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
