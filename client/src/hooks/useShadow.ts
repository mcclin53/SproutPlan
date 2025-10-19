import { useState, useEffect } from "react";

interface SunPosition {
  elevation: number; // degrees above horizon
  azimuth: number;   // degrees clockwise from North
}

interface Plant {
  _id: string;
  x: number;
  y: number;
  canopyRadius: number;
  height: number;
  sunReq: number;
}

interface Bed {
  width: number;
  length: number;
  plantInstances: Plant[];
}

interface ShadowData {
  sunlightHours: Record<string, number>; // plantId -> hours of sun received
  shadedPlants: string[];                // plant IDs partially or fully shaded
}

export const useShadow = (bed: Bed, sunPosition: SunPosition | null, maxSunHours = 12, timeOfDay?: number) => {
  const [shadowData, setShadowData] = useState<ShadowData>({ sunlightHours: {}, shadedPlants: [] });

  useEffect(() => {
    if (!sunPosition || !bed?.plantInstances) return;

    //nighttime check
    if (sunPosition.elevation <= 0) {
        setShadowData({
            sunlightHours: Object.fromEntries(
                bed.plantInstances.map((p) => [p._id, 0])
            ),
            shadedPlants: [],
        });
        return;
    }

    const { elevation, azimuth } = sunPosition;
    const radElevation = (elevation * Math.PI) / 180;
    const radAzimuth = (azimuth * Math.PI) / 180;

    const sunlightHours: Record<string, number> = {};
    const shadedPlants: string[] = [];

    // Precompute shadow vectors for all plants
    const shadowVectors = bed.plantInstances.map(plant => {
      const shadowLength = plant.height / Math.tan(radElevation); // vertical to horizontal projection
      const totalLength = shadowLength + plant.canopyRadius;             // include canopy radius
      return {
        _id: plant._id,
        x: plant.x,
        y: plant.y,
        canopyRadius: plant.canopyRadius,
        shadowEndX: plant.x + Math.cos(radAzimuth) * totalLength,
        shadowEndY: plant.y + Math.sin(radAzimuth) * totalLength,
        shadowLength: totalLength
      };
    });

    // Compute sunlight per plant
    bed.plantInstances.forEach(target => {
      let sunHours = maxSunHours;

      shadowVectors.forEach(shadowPlant => {
        if (shadowPlant._id === target._id) return;

        // Vector from shadow plant to target plant
        const dx = target.x - shadowPlant.x;
        const dy = target.y - shadowPlant.y;

        // Project target onto shadow vector (dot product)
        const shadowDirX = Math.cos(radAzimuth);
        const shadowDirY = Math.sin(radAzimuth);
        const distanceAlongSun = dx * shadowDirX + dy * shadowDirY;

        // Only consider plants "downstream" in sun direction
        if (distanceAlongSun > 0 && distanceAlongSun <= shadowPlant.shadowLength) {
          // Compute perpendicular distance from shadow line
          const perpDist = Math.abs(-shadowDirY * dx + shadowDirX * dy);

          // Check if target is within shadow width (canopy radius)
          const shadowWidth = shadowPlant.canopyRadius * 2;
          if (perpDist <= shadowWidth / 2) {
            // Partial shading: reduce sun proportionally
            const shadingFactor = 0.5;
            sunHours -= maxSunHours * shadingFactor;
            if (!shadedPlants.includes(target._id)) shadedPlants.push(target._id);
          }
        }
      });
      sunlightHours[target._id] = Math.max(0, sunHours);
    });

    setShadowData({ sunlightHours, shadedPlants });
  }, [bed, sunPosition, maxSunHours, timeOfDay]);

  return shadowData;
};
