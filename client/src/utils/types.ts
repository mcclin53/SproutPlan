export type DayWeather = {
  dateISO: string;
  tMeanC: number;
  tMinC: number;
  tMaxC: number;
  precipMm: number;
  et0Mm?: number | null; // allow null for “not computed”
};

export type HourlyWeather = {
  timeISO: string[];   // 24 timestamps
  tempC: number[];     // °C
  precipMm: number[];  // mm
  et0Mm?: number[] | null; // optional/nullable on climo
};

export type StressOverrides = {
  enabled: boolean;
  tempC?: number | null;
  soilMoisture?: number | null; // same scale as the soil model (0–1 or mm)
};

export interface LeafLayoutEntry {
  index: number;
  angleDeg: number;
  radiusPx: number;
  heightFrac: number;
}
