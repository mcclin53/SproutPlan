import type { UseDragComponentOpts } from "../hooks/useDragComponent";

export function dragConfigFrom(
  opts: {
    persistKey: string;
    initialPos?: { x: number; y: number };
    z?: number;
    grid?: { x: number; y: number };
  }
): UseDragComponentOpts {
  return {
    initialPos: opts.initialPos ?? { x: 16, y: 16 },
    persistKey: opts.persistKey,
    z: opts.z ?? 50,
    grid: opts.grid ?? { x: 1, y: 1 },
  };
}