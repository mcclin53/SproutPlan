import { useState, useEffect } from "react";
import SunCalc from "suncalc";

export const useSunData = (latitude: number, longitude: number, date?: Date) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!latitude || !longitude) return;

    setLoading(true);
    const targetDate = date || new Date();

    const times = SunCalc.getTimes(targetDate, latitude, longitude);
    const position = SunCalc.getPosition(targetDate, latitude, longitude);

    setData({
      solarElevation: (position.altitude * 180) / Math.PI,
      solarAzimuth: (position.azimuth * 180) / Math.PI,
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon: times.solarNoon,
      daylightDuration: (times.sunset.getTime() - times.sunrise.getTime()) / 1000,
    });

    setLoading(false);
  }, [latitude, longitude, date]);

  return { data, loading };
};
