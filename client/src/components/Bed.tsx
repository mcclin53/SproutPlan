import React from "react";
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
    plantInstances?: PlantInstance[]; // optional
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

  // Ensure we call this only once at component-level (not inside the map)
  const plantInstances = bed?.plantInstances || [];

  // API base for images (set VITE_API_URL in client .env if you want)
  const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

  // Track failed images by plantInstance id so we don't keep retrying on re-render
  const [failedImages, setFailedImages] = React.useState<Record<string, boolean>>({});

  // Keep failedImages trimmed to current plant instances so the map doesn't grow forever
  React.useEffect(() => {
    setFailedImages(prev => {
      const keep: Record<string, boolean> = {};
      plantInstances.forEach(pi => {
        if (prev[pi._id]) keep[pi._id] = true;
      });
      return keep;
    });
  }, [plantInstances.map(pi => pi._id).join(",")]);

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
            // build the remote URL correctly:
            // - if basePlant.image is a path starting with '/', treat it as already correct (/images/...)
            // - if it's just a filename, prefix with /images/
            // - always prefix with BASE_URL so browser requests go to your Express server (port 3001)
            const imgField = plantInstance.basePlant.image;
            const remote =
              imgField && imgField.startsWith("/")
                ? `${BASE_URL}${imgField}`
                : imgField
                ? `${BASE_URL}/images/${imgField}`
                : `${BASE_URL}/images/placeholder.png`;

            // if this image previously failed, use the placeholder (on subsequent renders this prevents flipping back)
            const imageSrc = failedImages[plantInstance._id] ? `${BASE_URL}/images/placeholder.png` : remote;

            return (
              <li key={plantInstance._id} style={{ display: "flex", alignItems: "center" }}>
                <img
                  src={imageSrc}
                  alt={plantInstance.basePlant.name}
                  title={plantInstance.basePlant.name}
                  style={{ width: 40, height: 40 }}
                  onError={(e) => {
                    const id = plantInstance._id;
                    // mark failed once; this state prevents React from re-applying the original (broken) src on next render
                    setFailedImages(prev => (prev[id] ? prev : { ...prev, [id]: true }));
                    // also set the element src defensively (in case state update happens after)
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith("/images/placeholder.png")) {
                      target.src = `${BASE_URL}/images/placeholder.png`;
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
