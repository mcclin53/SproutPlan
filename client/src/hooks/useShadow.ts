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

interface SceneObject {
  _id: string;
  type: "plant" | "tree" | "structure";
  x: number;
  y: number;
  height: number;
  canopyRadius?: number;
  width?: number;
  depth?: number;
}

interface ShadowVector {
  _id: string;
  x: number;
  y: number;
  shadowEndX: number;
  shadowEndY: number;
  shadowLength: number;
  canopyRadius?: number;
  width?: number;
  depth?: number;
}

interface ShadowData {
  sunlightHours: Record<string, number>;
  shadedPlants: string[];
  shadowVectors: ShadowVector[];
}

export const useShadow = (
  sceneObjects: SceneObject[],
  sunPosition: SunPosition | null
) => {
  const [shadowData, setShadowData] = useState<ShadowData>({
    sunlightHours: {},
    shadedPlants: [],
    shadowVectors: [],
  });

  useEffect(() => {
    if (!sunPosition) return;

    const radElevation = (sunPosition.elevation * Math.PI) / 180;
    const radAzimuth = (sunPosition.azimuth * Math.PI) / 180;

    const shadowVectors: ShadowVector[] = sceneObjects.map(obj => {
      const shadowLength = obj.height / Math.tan(radElevation);
      const totalLength = shadowLength + (obj.canopyRadius ?? 0);

      if (obj.type === "plant" || obj.type === "tree") {
        return {
          _id: obj._id,
          x: obj.x,
          y: obj.y,
          shadowEndX: obj.x + Math.cos(radAzimuth) * totalLength,
          shadowEndY: obj.y + Math.sin(radAzimuth) * totalLength,
          shadowLength: totalLength,
          canopyRadius: obj.canopyRadius ?? 0,
        };
    } else if (obj.type === "structure") {
      return {
        _id: obj._id,
        x: obj.x,
        y: obj.y,
        shadowEndX: obj.x + Math.cos(radAzimuth) * shadowLength,
        shadowEndY: obj.y + Math.sin(radAzimuth) * shadowLength,
        shadowLength,
        width: obj.width,
        depth: obj.depth,
      };
    }
    return null as any; // fallback
  });

    const shadedPlants: string[] = [];

  sceneObjects.forEach(target => {
    shadowVectors.forEach(shadow => {
      if (shadow._id === target._id) return;

      if (shadow.canopyRadius) {
        // circular shadow
        const targetRadius = target.canopyRadius ?? 0;
        const dx = target.x - shadow.x;
        const dy = target.y - shadow.y;
        const proj = dx * Math.cos(radAzimuth) + dy * Math.sin(radAzimuth);
        const dist = Math.abs(dx * Math.sin(radAzimuth)) + Math.abs(dy * Math.cos(radAzimuth));
        if (proj > 0 && proj < shadow.shadowLength && dist < targetRadius) {
          shadedPlants.push(target._id);
        }
      } else if (shadow.width && shadow.depth) {
        // rectangular shadow
        const shadowEndX = shadow.shadowEndX;
        const shadowEndY = shadow.shadowEndY;

        const minX = Math.min(shadow.x, shadowEndX) - (shadow.width ?? 0)/2;
        const maxX = Math.max(shadow.x, shadowEndX) + (shadow.width ?? 0)/2;
        const minY = Math.min(shadow.y, shadowEndY) - (shadow.depth ?? 0)/2;
        const maxY = Math.max(shadow.y, shadowEndY) + (shadow.depth ?? 0)/2;

        if (
          target.x >= minX &&
          target.x <= maxX &&
          target.y >= minY &&
          target.y <= maxY
        ) {
          shadedPlants.push(target._id);
        }
      }
    });
  });

    setShadowData({ sunlightHours: {}, shadedPlants, shadowVectors });
  }, [sceneObjects, sunPosition]);

  return shadowData;
};

