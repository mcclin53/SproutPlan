import { useEffect, useState, useRef } from "react";

interface Plant {
  _id: string;
  name: string;
  sunReq: number;
  baseGrowthRate: number;
  height: number;
  canopyRadius: number;
  maxHeight: number;
  maxCanopy: number;
  maturityDays: number;
  growthStage?: number;
}

interface ShadowData {
  sunlightHours: Record<string, number>; // plantId → hours of sun
}

interface GrowTrigger {
  simulateMidnight?: boolean; // if true, grow once daily
}

export const useGrowPlant = (
  plants: Plant[],
  shadowData: ShadowData,
  options: GrowTrigger = {}
) => {
  const [grownPlants, setGrownPlants] = useState<Plant[]>(plants);

  const lastUpdateRef = useRef<number>(Date.now());
  const lastDayRef = useRef<string>(new Date().toDateString());

  useEffect(() => {
    if (!shadowData || !plants?.length) return;

    const simulatedDate = new Date();

    // Reset daily growth counters at start of a new day
    const currentDay = simulatedDate.toDateString();
    if (lastDayRef.current !== currentDay) {
      lastDayRef.current = currentDay;
      lastUpdateRef.current = simulatedDate.getTime();
    }

        // Calculate time elapsed since last update in hours
    const now = simulatedDate.getTime();
    const deltaHours = (now - lastUpdateRef.current) / (1000 * 60 * 60);
    lastUpdateRef.current = now;

    // trigger growth once a day at midnight
    if (options.simulateMidnight && simulatedDate.getHours() !== 0) return;

    const newPlants = plants.map((plant) => {
      const sunlightHours = shadowData.sunlightHours[plant._id] ?? 0;
      const sunlightRatio = sunlightHours / (plant.sunReq ?? 1); // avoid divide by zero

      const baseGrowthRate = plant.baseGrowthRate ?? 0;
      const adjustedGrowthRate = baseGrowthRate * Math.min(1, sunlightRatio);

      const growthProgress = (adjustedGrowthRate * deltaHours) / (plant.maturityDays ?? 1);
      const newGrowthStage = Math.min(1, (plant.growthStage ?? 0) + growthProgress);

      console.log(
        `${plant.name}: baseRate=${baseGrowthRate.toFixed(4)}, adjustedRate=${adjustedGrowthRate.toFixed(4)}, sunlight=${sunlightHours}/${plant.sunReq ?? 1}`
      );

      const newHeight = (plant.maxHeight ?? 0) * newGrowthStage;
      const newCanopy = (plant.maxCanopy ?? 0) * newGrowthStage;

      const prevHeight = plant.height ?? 0;
      const prevCanopy = plant.canopyRadius ?? 0;

      const heightGrowth = newHeight - prevHeight;
      const canopyGrowth = newCanopy - prevCanopy;

      console.log(
        `${plant.name} grew ${heightGrowth.toFixed(2)}cm taller and ${canopyGrowth.toFixed(2)}cm wider today. (Sunlight: ${sunlightHours.toFixed(1)}h / Required: ${plant.sunReq ?? 1}h)`
      );

      return {
        ...plant,
        growthStage: newGrowthStage,
        height: newHeight,
        canopyRadius: newCanopy,
      };
    });

    setGrownPlants(newPlants);
  }, [shadowData, options.simulateMidnight, plants]);

  return grownPlants;
};
