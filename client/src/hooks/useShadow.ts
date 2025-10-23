import { useState, useEffect, useRef, useMemo } from "react";
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

   const sunDeps = useMemo(
    () =>
      sunPosition
        ? [Number(sunPosition.elevation), Number(sunPosition.azimuth)]
        : [null, null],
    [sunPosition]
  );

  useEffect(() => {
  if (!sunPosition || sunPosition.elevation <= 0) {
    setShadowData(prev =>
      prev.shadowVectors.length || prev.shadedPlants.length
        ? { sunlightHours: prev.sunlightHours, shadedPlants: [], shadowVectors: [] }
        : prev
    );
    return;
  }

  const radElevation = (sunPosition.elevation * Math.PI) / 180;
  const radAzimuth = (sunPosition.azimuth * Math.PI) / 180;

  // precompute shadow direction (used by both vector calc & overlap test)
  const dirX = Math.cos(radAzimuth);
  const dirY = Math.sin(radAzimuth);

  console.log(`Calculating shadows for ${sceneObjects.length} scene objects`);

  const shadowVectors: ShadowVector[] = sceneObjects
    .map(obj => {
      const shadowLength = obj.height / Math.tan(radElevation);
      const totalLength = shadowLength + (obj.canopyRadius ?? 0);

      if (obj.type === "plant" || obj.type === "tree") {
        return {
          _id: obj._id,
          x: obj.x,
          y: obj.y,
          shadowEndX: obj.x + dirX * totalLength,
          shadowEndY: obj.y + dirY * totalLength,
          shadowLength: totalLength,
          canopyRadius: obj.canopyRadius ?? 0,
        };
      } else if (obj.type === "structure") {
        return {
          _id: obj._id,
          x: obj.x,
          y: obj.y,
          shadowEndX: obj.x + dirX * shadowLength,
          shadowEndY: obj.y + dirY * shadowLength,
          shadowLength,
          width: obj.width,
          depth: obj.depth,
        };
      }
      return null as any; // fallback
    })
    .filter(Boolean) as ShadowVector[];

  const shadedPlants: string[] = [];

  sceneObjects.forEach(target => {
    shadowVectors.forEach(shadow => {
      if (shadow._id === target._id) return;

      if (shadow.canopyRadius != null) {
        // circular shadow (canopy-radius “band” around the axis)
        const targetRadius = target.canopyRadius ?? 0;
        const dx = target.x - shadow.x;
        const dy = target.y - shadow.y;

        // distance ALONG the shadow axis
        const along = dx * dirX + dy * dirY;
        // proper PERPENDICULAR distance to the axis
        const perp = Math.abs(-dirY * dx + dirX * dy);

        if (along > 0 && along < shadow.shadowLength && perp < targetRadius) {
          shadedPlants.push(target._id);
        }
      } else if (shadow.width && shadow.depth) {
        // rectangular shadow (structure)
        const shadowEndX = shadow.shadowEndX;
        const shadowEndY = shadow.shadowEndY;

        const minX = Math.min(shadow.x, shadowEndX) - (shadow.width ?? 0) / 2;
        const maxX = Math.max(shadow.x, shadowEndX) + (shadow.width ?? 0) / 2;
        const minY = Math.min(shadow.y, shadowEndY) - (shadow.depth ?? 0) / 2;
        const maxY = Math.max(shadow.y, shadowEndY) + (shadow.depth ?? 0) / 2;

        if (target.x >= minX && target.x <= maxX && target.y >= minY && target.y <= maxY) {
          shadedPlants.push(target._id);
        }
      }
    });
  });

  console.log(`Shaded plants:`, shadedPlants);

  setShadowData(prev => {
    const next: ShadowData = {
      sunlightHours: prev.sunlightHours, // preserve your tally
      shadedPlants,
      shadowVectors,
    };
    return next;
  });
}, [sceneObjects, sunPosition]);

  return shadowData;
};

