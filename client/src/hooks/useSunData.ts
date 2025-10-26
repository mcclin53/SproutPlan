import { useState, useEffect } from "react";
import SunCalc from "suncalc";

type SunData = {
  // Raw SunCalc values (azimuth from South, +West)
  solarElevation: number;     // degrees
  solarAzimuth: number;       // degrees, 0=S, 90=W, 180=N, 270=E
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  daylightDuration: number;   // seconds

  // Screen-mapped values (north=up, east=right, y-down canvas)
  screenAzimuth: number;      // degrees, 0=N, 90=E, 180=S, 270=W
  sunVec: { x: number; y: number };     // unit vector toward the sun
  shadowVec: { x: number; y: number };  // unit vector for shadow direction
};

export const useSunData = (latitude: number, longitude: number, date?: Date) => {
  const [data, setData] = useState<SunData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (latitude == null || longitude == null) return;

    setLoading(true);
    const t = date ?? new Date();

    const times = SunCalc.getTimes(t, latitude, longitude);
    const pos = SunCalc.getPosition(t, latitude, longitude);

    const solarElevation = (pos.altitude * 180) / Math.PI; // deg
    const solarAzimuth   = (pos.azimuth  * 180) / Math.PI; // deg, 0=S

    // Rotate so 0°=North, 90°=East, 180°=South, 270°=West
    const screenAzimuth = (solarAzimuth + 180 + 360) % 360;
    const azRad = (screenAzimuth * Math.PI) / 180;

    // Screen coords: +x right, +y down
    const sunX = Math.sin(azRad);
    const sunY = -Math.cos(azRad);
    const shadowX = -sunX;
    const shadowY = -sunY;

    setData({
      solarElevation,
      solarAzimuth,
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon: times.solarNoon,
      daylightDuration: (times.sunset.getTime() - times.sunrise.getTime()) / 1000,

      screenAzimuth,
      sunVec:    { x: sunX,    y: sunY    },
      shadowVec: { x: shadowX, y: shadowY },
    });

    setLoading(false);
  }, [latitude, longitude, date]);

  return { data, loading };
};
