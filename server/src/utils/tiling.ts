//clamping for lat and lon to prevent bad inputs
export function clampLat(x: number) {
  return Math.max(-90, Math.min(90, x));
}
export function clampLon(x: number) {
  return Math.max(-180, Math.min(180, x));
}
// round a single coordinate to the nearest tile
export function snapCoord(x: number, step = 0.1) {
  return Math.round(x / step) * step;
}
//return snapped and clamped lat/lon
export function snapTile(lat: number, lon: number, step = 0.1) {
  const latRounded = snapCoord(clampLat(lat), step);
  const lonRounded = snapCoord(clampLon(lon), step);
  return { latRounded, lonRounded };
}
//generate a key for a lat/lon tile
export function tileKey(lat: number, lon: number, step = 0.1) {
  const { latRounded, lonRounded } = snapTile(lat, lon, step);
  return `${latRounded.toFixed(3)},${lonRounded.toFixed(3)}`;
}
