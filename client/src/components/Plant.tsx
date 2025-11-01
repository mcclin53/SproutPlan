import { useDrag } from "react-dnd";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface PlantProps {
  plant: {
    _id: string;
    name: string;
    image?: string;
    waterReq?: string;
    spacing?: number;
  };
}

export default function Plant({ plant }: PlantProps) {
  const [, drag] = useDrag(() => ({
    type: "BASE_PLANT",
    item: { id: plant._id, name: plant.name, type: "BASE_PLANT" },
  }));

  return (
    <div ref={drag} className="plant-item" title="Drag Plant to Bed">
      {plant.image && (
        <img
          src={`${BASE_URL}${plant.image}`}
          alt={plant.name}
          style={{ width: 40, height: 40, marginRight: 8 }}
        />
      )}
      <span>{plant.name}</span>
    </div>
  );
}
