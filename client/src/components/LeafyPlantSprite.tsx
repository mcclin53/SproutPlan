// client/components/LeafyPlantSprite.tsx
import React, { useMemo } from "react";

export type LeafLayoutEntry = {
  index: number;
  angleDeg: number;
  radiusPx: number;
  heightFrac: number; // 0..1 up the stem
};

interface LeafyPlantSpriteProps {
  /**
   * How many “leaves worth” of growth we have.
   * e.g. 0.0 = first leaf starting, 1.0 = first leaf done,
   * 1.3 = first leaf done + second leaf 30% grown, etc.
   */
  leafGrowth: number;

  /** Persisted layout from the server (Bed.plants.leafLayout) */
  leafLayout: LeafLayoutEntry[];

  /** Max leaves for this plant (basePlant.maxLeaves, with fallback) */
  maxLeaves: number;

  /**
   * Ordered list of leaf image URLs for this plant
   * (you can get this from a sprite mapping util: getSprites(basePlant.leafSpriteSet))
   */
  sprites: string[];

  /** Overall visual size of the plant sprite on screen */
  sizePx?: number;
}

export const LeafyPlantSprite: React.FC<LeafyPlantSpriteProps> = ({
  leafGrowth,
  leafLayout,
  maxLeaves,
  sprites,
  sizePx = 80,
}) => {
  const clampedMaxLeaves = Math.max(1, maxLeaves);
  const safeLayout = leafLayout ?? [];
  const safeSprites = sprites ?? [];

  const { leavesToRender, stemHeight } = useMemo(() => {
    if (!safeSprites.length) {
      return { leavesToRender: [] as any[], stemHeight: sizePx * 0.6 };
    }

    // Clamp growth between 0 and maxLeaves
    const indexFloat = Math.min(
      Math.max(leafGrowth ?? 0, 0),
      clampedMaxLeaves
    );

    const fullyGrownLeaves = Math.floor(indexFloat); // how many are at 100%
    const partialLeafProgress = indexFloat - fullyGrownLeaves; // 0..1 for the current leaf

    const leaves: {
      sprite: string;
      layout: LeafLayoutEntry;
      progress: number; // 0..1 scale for this leaf
      key: string;
    }[] = [];

    for (let i = 0; i < clampedMaxLeaves; i++) {
      // Try to find layout entry by index; fallback to positional indexing
      const layout =
        safeLayout.find((l) => l.index === i) || safeLayout[i];

      if (!layout) continue;

      let progress = 0;

      if (i < fullyGrownLeaves) {
        progress = 1; // fully grown
      } else if (i === fullyGrownLeaves && indexFloat < clampedMaxLeaves) {
        progress = partialLeafProgress; // currently growing leaf
      } else {
        progress = 0; // not started yet
      }

      if (progress <= 0) continue;

      const sprite = safeSprites[i % safeSprites.length];

      leaves.push({
        sprite,
        layout,
        progress,
        key: `leaf-${i}`,
      });
    }

    // Determine how tall the stem should be based on highest leaf
    const highestFrac = safeLayout
      .slice(0, clampedMaxLeaves)
      .reduce((max, l) => (l && l.heightFrac > max ? l.heightFrac : max), 0);

    const stemHeight =
      sizePx * 0.2 + sizePx * 0.6 * (highestFrac || 0.8); // simple heuristic

    return { leavesToRender: leaves, stemHeight };
  }, [leafGrowth, clampedMaxLeaves, safeLayout, safeSprites, sizePx]);

  if (!sprites.length) {
    return null; // no images, nothing to draw
  }

  return (
    <div
      style={{
        position: "relative",
        width: sizePx,
        height: sizePx,
        transform: "translate(-50%, -50%)", // so you can place this at plantInstance.x/y center
        pointerEvents: "none",
      }}
    >
      {/* Stem */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: sizePx * 0.06,
          height: stemHeight,
          background: "green",
          borderRadius: sizePx * 0.06,
          transform: "translateX(-50%)",
        }}
      />

      {/* Leaves */}
      {leavesToRender.map(({ sprite, layout, progress, key }) => {
        const { angleDeg, radiusPx, heightFrac } = layout;

        // Side based on angle sign: positive = right, negative = left
        const side = angleDeg >= 0 ? 1 : -1;

        // How far from stem, horizontally & vertically
        const xOffset = side * (radiusPx ?? sizePx * 0.2);
        const yOffset = (heightFrac ?? 0.5) * stemHeight;

        // Size scales with progress so it grows from tiny → full
        const baseWidth = sizePx * 0.35;
        const width = baseWidth * (0.3 + 0.7 * progress); // never totally zero

        return (
          <img
            key={key}
            src={sprite}
            alt="leaf"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width,
              height: "auto",
              transform: `
                translate(${xOffset}px, ${yOffset}px)
                rotate(${angleDeg}deg)
              `,
              transformOrigin: "0% 0%", // base of the leaf near the stem
              pointerEvents: "none",
            }}
          />
        );
      })}
    </div>
  );
};
