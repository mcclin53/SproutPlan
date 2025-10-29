// client/src/components/Weather.tsx
import React, { useState } from "react";
import { useWeather, type DayWeather } from "../hooks/useWeather";

type Props = {
  lat: number;
  lon: number;
  onIrrigate?: (mm: number) => void;
};

export default function Weather({ lat, lon, onIrrigate }: Props) {
  // anchor the weather fetch to the time the user loaded the page
  const [anchorDate] = useState(() => new Date());

  const { day, loading, error } = useWeather(lat, lon, anchorDate);

  if (loading) {
    return (
      <div className="weather-card" style={cardStyle}>
        <strong>Weather</strong>
        <div>Loading current weather…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-card" style={cardStyle}>
        <strong>Weather</strong>
        <div>Error fetching weather: {error.message}</div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="weather-card" style={cardStyle}>
        <strong>Weather</strong>
        <div>No data available</div>
      </div>
    );
  }

  return (
    <div className="weather-card" style={cardStyle}>
      <strong>Weather — {day.dateISO}</strong>
      <div>
        Temp (mean/min/max):{" "}
        {day.tMeanC.toFixed(1)}°C / {day.tMinC.toFixed(1)}°C / {day.tMaxC.toFixed(1)}°C
      </div>
      <div>Precip: {day.precipMm.toFixed(1)} mm</div>
      <div>ET₀: {day.et0Mm?.toFixed(1) ?? "—"} mm</div>

      {onIrrigate && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => onIrrigate(5)} style={btn}>
            Irrigate +5 mm
          </button>
          <button onClick={() => onIrrigate(10)} style={btn}>
            +10 mm
          </button>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: "#f7fafc",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  fontSize: 14,
};

const btn: React.CSSProperties = {
  marginRight: 8,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};
