import { useDrag } from "react-dnd";

interface PlantProps {
  name: string;
}

export default function Plant({ name }: PlantProps) {
  const [, drag] = useDrag(() => ({
    type: "PLANT",
    item: { name },
  }));

  return (
    <div ref={drag} className="plant-item">
      {name}
    </div>
  );
}
