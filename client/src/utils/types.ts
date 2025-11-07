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