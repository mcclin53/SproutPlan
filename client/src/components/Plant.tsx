import { useDrag } from "react-dnd";
import { resolvePlantImageSrc, handleImageError } from "../utils/plantImage";

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
          src={resolvePlantImageSrc(plant.image)}
          alt={plant.name}
          onError={handleImageError}
          style={{ width: 40, height: 40, marginRight: 8 }}
        />
      )}
      <span>{plant.name}</span>
    </div>
  );
}
