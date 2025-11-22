import tomatoLeaf1 from "../assets/leaves/tomato/leaf01.png";
import tomatoLeaf2 from "../assets/leaves/tomato/leaf02.png";
// ...etc

const SPRITE_SETS: Record<string, string[]> = {
  tomatoBasic: [tomatoLeaf1, tomatoLeaf2],
  // beanBasic: [...],
};

export function getLeafSpritesFor(key?: string | null): string[] {
  if (!key) return SPRITE_SETS["tomatoBasic"] || [];
  return SPRITE_SETS[key] || SPRITE_SETS["tomatoBasic"] || [];
}
