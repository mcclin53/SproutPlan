import { useState, useEffect, useRef } from "react";
import SunCalc from "suncalc";

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
  sunlightHours: Record<string, number>; // plantId -> cumulative hours
  shadedPlants: string[];                // partially or fully shaded plants
}

export const useShadow = (
  bed: Bed,
  sunPosition: SunPosition | null,
  simulatedDate: Date,
  maxSunHours = 12
) => {
  const [shadowData, setShadowData] = useState<ShadowData>({
    sunlightHours: {},
    shadedPlants: [],
  });

  const lastUpdateRef = useRef<number>(simulatedDate.getTime());
  const lastDayRef = useRef<string>(simulatedDate.toDateString());

  useEffect(() => {
    if (!sunPosition || !bed?.plantInstances) return;

    // Reset daily sunlight at midnight
    const currentDay = simulatedDate.toDateString();
    if (lastDayRef.current !== currentDay) {
      lastDayRef.current = currentDay;
      setShadowData({ sunlightHours: {}, shadedPlants: [] });
      lastUpdateRef.current = simulatedDate.getTime(); // reset reference
    }

    // Calculate elapsed simulated time in hours since last tick
    const now = simulatedDate.getTime();
    const deltaHours = (now - lastUpdateRef.current) / (1000 * 60 * 60);
    lastUpdateRef.current = now;

    // Skip accumulation if sun is below horizon
    if (sunPosition.elevation <= 0) return;

    const radElevation = (sunPosition.elevation * Math.PI) / 180;
    const radAzimuth = (sunPosition.azimuth * Math.PI) / 180;

    // Precompute shadow vectors
    const shadowVectors = bed.plantInstances.map((plant) => {
      const shadowLength = plant.height / Math.tan(radElevation);
      const totalLength = shadowLength + plant.canopyRadius;
      return {
        _id: plant._id,
        x: plant.x,
        y: plant.y,
        shadowEndX: plant.x + Math.cos(radAzimuth) * totalLength,
        shadowEndY: plant.y + Math.sin(radAzimuth) * totalLength,
        shadowLength: totalLength,
        canopyRadius: plant.canopyRadius,
      };
    });

    const newSunlightHours: Record<string, number> = { ...shadowData.sunlightHours };
    const shadedPlants: string[] = [];

    // Calculate shading per plant
    bed.plantInstances.forEach((target) => {
      let effectiveHours = deltaHours;

      shadowVectors.forEach((shadowPlant) => {
        if (shadowPlant._id === target._id) return;

        const dx = target.x - shadowPlant.x;
        const dy = target.y - shadowPlant.y;

        const shadowDirX = Math.cos(radAzimuth);
        const shadowDirY = Math.sin(radAzimuth);
        const distanceAlongSun = dx * shadowDirX + dy * shadowDirY;

        if (distanceAlongSun > 0 && distanceAlongSun <= shadowPlant.shadowLength) {
          const perpDist = Math.abs(-shadowDirY * dx + shadowDirX * dy);
          const shadowWidth = shadowPlant.canopyRadius * 2;
          if (perpDist <= shadowWidth / 2) {
            const shadingFactor = 0.5; // 50% sunlight blocked
            effectiveHours *= 1 - shadingFactor;
            if (!shadedPlants.includes(target._id)) shadedPlants.push(target._id);
          }
        }
      });

      newSunlightHours[target._id] = (newSunlightHours[target._id] || 0) + effectiveHours;
    });

    setShadowData({ sunlightHours: newSunlightHours, shadedPlants });

    // Debug logs
    console.log(
      "[Shadow Debug] Sun position → elevation:",
      sunPosition.elevation.toFixed(2),
      "azimuth:",
      sunPosition.azimuth.toFixed(2)
    );
    console.log("[Shadow Debug] Cumulative sunlight per plant:", newSunlightHours);
    console.log("[Shadow Debug] Shadow vectors:", shadowVectors);
  }, [bed, sunPosition, simulatedDate, maxSunHours]);

  return shadowData;
};
