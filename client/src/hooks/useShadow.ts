import { useState, useEffect } from "react";

interface SunPosition {
  elevation: number; // degrees above horizon
  azimuth: number;   // degrees clockwise from North (screen coords)
}

interface SceneObject {
  _id: string;
  type: "plant" | "tree" | "structure";
  x: number; y: number;
  height: number;           // cm
  canopyRadius?: number;    // cm
  width?: number; depth?: number;           // px (for structures)
}

interface ShadowVector {
  _id: string;
  x: number; y: number;
  startX?: number; startY?: number;
  shadowEndX: number; shadowEndY: number;
  shadowLength: number;     // px
  canopyRadius?: number;    // px (for plant/tree shadows)
  width?: number; depth?: number;           // px (for structures)
}

interface ShadowData {
  sunlightHours: Record<string, number>;
  shadedPlants: string[];
  shadowVectors: ShadowVector[];
}

export const useShadow = (
  sceneObjects: SceneObject[],
  sunPosition: SunPosition | null,
  debug = false
) => {
  const [shadowData, setShadowData] = useState<ShadowData>({
    sunlightHours: {},
    shadedPlants: [],
    shadowVectors: [],
  });

  useEffect(() => {
    // No sun → clear shadows
    if (!sunPosition || sunPosition.elevation <= 0) {
      if (debug) console.log("[Shadow] Night or no sun — clearing shadows");
      setShadowData(prev =>
        prev.shadowVectors.length || prev.shadedPlants.length
          ? { sunlightHours: prev.sunlightHours, shadedPlants: [], shadowVectors: [] }
          : prev
      );
      return;
    }

    const radElevation = (sunPosition.elevation * Math.PI) / 180;
    const azRad = (sunPosition.azimuth * Math.PI) / 180;

    // Screen coords: +x right, +y down
    // Unit vector toward the sun:
    const sunX = Math.sin(azRad);
    const sunY = -Math.cos(azRad);
    // Shadow goes opposite the sun:
    const dirX = -sunX;
    const dirY = -sunY;

    // Convert physical cm → screen px 
    const PX_PER_CM = 2;

    if (debug) {
      console.log(
        `[Shadow] sun`,
        { elev: sunPosition.elevation.toFixed(1), az: sunPosition.azimuth.toFixed(1) },
        `dir=(${dirX.toFixed(2)}, ${dirY.toFixed(2)})`,
        `objs=${sceneObjects.length}`
      );
      console.log(
        `[Shadow] Direction vector — dirX: ${dirX.toFixed(2)}, dirY: ${dirY.toFixed(2)}`
      );
    }

    const shadowVectors: ShadowVector[] = sceneObjects
      .map(obj => {
        // shadow length from object height
        const shadowLengthPx = (obj.height * PX_PER_CM) / Math.tan(radElevation);
        if (!isFinite(shadowLengthPx) || shadowLengthPx <= 0) return null;

        if (obj.type === "plant" || obj.type === "tree") {
          const casterRadiusPx = (obj.canopyRadius ?? 0) * PX_PER_CM;
          const totalLength = shadowLengthPx + casterRadiusPx;

          const startX = obj.x + dirX * casterRadiusPx; // start shadow at edge of canopy
          const startY = obj.y + dirY * casterRadiusPx;

          return {
            _id: obj._id,
            x: obj.x,
            y: obj.y,
            startX,
            startY,
            shadowEndX: obj.x + dirX * totalLength,
            shadowEndY: obj.y + dirY * totalLength,
            shadowLength: totalLength,
            canopyRadius: casterRadiusPx, // stored in px
          } as ShadowVector & { startX: number; startY: number };
        } else if (obj.type === "structure") {
          return {
            _id: obj._id,
            x: obj.x,
            y: obj.y,
            startX: obj.x,
            startY: obj.y,
            shadowEndX: obj.x + dirX * shadowLengthPx,
            shadowEndY: obj.y + dirY * shadowLengthPx,
            shadowLength: shadowLengthPx,
            width: obj.width,
            depth: obj.depth,
          } as ShadowVector & { startX: number; startY: number };
        }
        return null;
      })
      .filter(Boolean) as ShadowVector[];

          if (debug) {
      console.log(
        "[Shadow] Computed shadow vectors:",
        shadowVectors.map(v => ({
          id: v._id,
          from: { x: Math.round(v.x), y: Math.round(v.y) },
          to: { x: Math.round(v.shadowEndX), y: Math.round(v.shadowEndY) },
          len: Math.round(v.shadowLength),
        }))
      );
    }

    const shadedIds: string[] = [];

    // Overlap test
    sceneObjects.forEach(target => {
      shadowVectors.forEach(shadow => {
        if (shadow._id === target._id) return; // a plant doesn't shade itself

        const dx = target.x - shadow.x;
        const dy = target.y - shadow.y;

        // Distance along the shadow axis (positive = down-shadow)
        const along = dx * dirX + dy * dirY;
        // Perpendicular distance from shadow axis
        const perp = Math.abs(-dirY * dx + dirX * dy);

        if (shadow.canopyRadius != null) {
          // Circular "tube" (plant/tree shadow)
          const start = shadow.canopyRadius;           // begin beyond caster canopy
          const end = shadow.shadowLength;

          const elev = Math.max(0, sunPosition.elevation);
          const MIN_WIDTH = 14;                       // px: prevents needle-thin tubes
          const widen = 1 + (30 / Math.max(8, elev)); // stronger widening at low elevation
          const halfWidth = Math.max(MIN_WIDTH, shadow.canopyRadius * widen);

          if (along > start && along < end && perp < halfWidth) {
            shadedIds.push(target._id);
          }
        } else if (shadow.width && shadow.depth) {
          // Axis-aligned rectangle from caster to shadow end (structure)
          const minX = Math.min(shadow.x, shadow.shadowEndX) - (shadow.width ?? 0) / 2;
          const maxX = Math.max(shadow.x, shadow.shadowEndX) + (shadow.width ?? 0) / 2;
          const minY = Math.min(shadow.y, shadow.shadowEndY) - (shadow.depth ?? 0) / 2;
          const maxY = Math.max(shadow.y, shadow.shadowEndY) + (shadow.depth ?? 0) / 2;

          if (target.x >= minX && target.x <= maxX && target.y >= minY && target.y <= maxY) {
            shadedIds.push(target._id);
          }
        }
      });
    });

    const shadedPlants = Array.from(new Set(shadedIds));

    if (debug) {
      console.log("[Shadow] Shaded plant IDs:", shadedPlants);
      if (shadedPlants.length === 0) console.log("[Shadow] No plants shaded this frame");
    }

    setShadowData(prev => ({
      sunlightHours: prev.sunlightHours, // keep any external tally you’re doing
      shadedPlants,
      shadowVectors,
    }));
  }, [sceneObjects, sunPosition?.elevation, sunPosition?.azimuth]);

  return shadowData;
};
