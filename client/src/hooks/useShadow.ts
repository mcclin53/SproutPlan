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
  casterHeightCm?: number;
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
            casterHeightCm: obj.height,
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

// Precompute once (right after you compute radElevation)
const tanElev = Math.tan(radElevation);

// Overlap test (use canopy-edge as origin)
sceneObjects.forEach(target => {
  shadowVectors.forEach(shadow => {
    if (shadow._id === target._id) return; // no self-shade

    // ---- Plant/Tree "tube" shadows ----
    if (shadow.canopyRadius != null) {
      // Tube origin at canopy edge
      const sx = shadow.startX ?? shadow.x;
      const sy = shadow.startY ?? shadow.y;

      // Tube length measured FROM canopy edge (px)
      const L = Math.max(0, shadow.shadowLength - (shadow.canopyRadius ?? 0));
      if (L <= 0) return;

      // Axis unit vector (same as dirX/dirY)
      const ux = dirX, uy = dirY;

      // Vector from tube start -> target center
      const px = target.x - sx;
      const py = target.y - sy;

      // IMPORTANT: use raw projection to enforce direction and segment bounds
      const alongRaw = px * ux + py * uy; // px
      if (alongRaw < 0 || alongRaw > L) return; // not down-shadow (or past end)

      // Closest point on axis segment is at t = alongRaw (since within [0..L])
      const t = alongRaw;

      // Perpendicular distance to axis at that point
      const cx = px - ux * t;
      const cy = py - uy * t;
      const distToAxis = Math.hypot(cx, cy);

      // Tube half-width (wider at low sun)
      const elev = Math.max(0, sunPosition.elevation);
      const MIN_WIDTH = 14;
      const widen = 1 + (30 / Math.max(8, elev));
      const tubeHalfWidth = Math.max(MIN_WIDTH, (shadow.canopyRadius ?? 0) * widen);

      // Include the target's own radius so edge-overlap counts
      const targetRadiusPx = (target.canopyRadius ?? 0) * PX_PER_CM;
      const effectiveHalfWidth = tubeHalfWidth + targetRadiusPx;

      if (distToAxis > effectiveHalfWidth) return; // misses laterally

      // Height-aware occlusion at the closest point
      const dPx = t;                   // px beyond canopy edge
      const dCm = dPx / PX_PER_CM;     // convert to cm
      const casterH = shadow.casterHeightCm ?? 0; // cm (set when building vectors)
      const shadowHeightAtPoint = Math.max(0, casterH - dCm * tanElev);

      const targetH = target.height ?? 0; // cm
      if (targetH <= shadowHeightAtPoint) {
        shadedIds.push(target._id);
      }

      return; // done with plant/tree branch
    }

    // ---- Rectangular structure shadows (unchanged) ----
    if (shadow.width && shadow.depth) {
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
