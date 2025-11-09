//clamping for lat and lon to prevent bad inputs
export function clampLat(x: number) {
  return Math.max(-90, Math.min(90, x));
}
export function clampLon(x: number) {
  return Math.max(-180, Math.min(180, x));
}
export const TILE_STEP = 0.1;

// derive how many decimals are needed from the step (e.g., 0.1 -> 1, 0.01 -> 2)
function decimalsFromStep(step: number) {
  const s = String(step);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : (s.length - dot - 1);
}

// round & normalize to kill FP noise (e.g., -85.60000000000001 -> -85.6)
function norm(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

// round a single coordinate to the nearest tile
export function snapCoord(x: number, step = 0.1) {
  return Math.round(x / step) * step;
}
//return snapped and clamped lat/lon
export function snapTile(lat: number, lon: number, step = TILE_STEP) {
  const d = decimalsFromStep(step);
  const latRounded = norm(snapCoord(clampLat(lat), step), d);
  const lonRounded = norm(snapCoord(clampLon(lon), step), d);
  return { latRounded, lonRounded };
}
//generate a key for a lat/lon tile
export function tileKey(lat: number, lon: number, step = TILE_STEP) {
  const d = decimalsFromStep(step);
  const { latRounded, lonRounded } = snapTile(lat, lon, step);
  return `${latRounded.toFixed(d)},${lonRounded.toFixed(d)}`;
}
