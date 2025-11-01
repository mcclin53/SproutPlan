import React, { useState } from "react";
import { useWeather, type DayWeather } from "../hooks/useWeather";
import { useDragComponent } from "../hooks/useDragComponent";
import { dragConfigFrom } from "../utils/dragConfig";

type Props = {
  lat: number;
  lon: number;
  onIrrigate?: (mm: number) => void;
  initialPos?: { x: number; y: number };
  z?: number;
  grid?: { x: number; y: number };
  persistKeyPrefix?: string;
  onClose?: () => void;
};

export default function Weather(props: Props) {
  const {
    lat,
    lon,
    onIrrigate,
    initialPos,
    z,
    grid,
    persistKeyPrefix = "Weather@",
    onClose,
  } = props;

  const { rootRef, handleRef, style } = useDragComponent(
      dragConfigFrom({
        persistKey: `${persistKeyPrefix}${lat.toFixed(3)},${lon.toFixed(3)}`,
        initialPos: initialPos ?? { x: 16, y: Math.max(16, window.innerHeight / 2 - 180) },
        z: z ?? 51,
        grid: grid ?? { x: 1, y: 1 },
      })
    );

  // anchor the weather fetch to the time the user loaded the page
  const [anchorDate] = useState(() => new Date());

  const { day, loading, error } = useWeather(lat, lon, anchorDate);

  if (loading) {
    return (
      <div className="card-shell" ref={rootRef} style={style}>
        <div className="statCard">
          <div
            ref={handleRef as React.MutableRefObject<HTMLDivElement>}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "move" }}>
            <strong>Weather</strong>
            <div>Loading current weather…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-shell" ref={rootRef} style={style}>
        <div className="stat-card">
          <div
            ref={handleRef as React.MutableRefObject<HTMLDivElement>}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "move" }}>
            <strong>Weather</strong>
            <div>Error fetching weather: {error.message}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="card-shell" ref={rootRef} style={style}>
        <div className="stat-card">
          <div
            ref={handleRef as React.MutableRefObject<HTMLDivElement>}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "move" }}>
            <strong>Weather</strong>
            <div>No data available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-shell" ref={rootRef} style={style}>
      <div className="stat-card" ref={handleRef as React.MutableRefObject<HTMLDivElement>}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "move", marginBottom: 8 }}>
              <div
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, #fffad1 0%, #ffd27a 55%, #ffb32a 100%)",
              boxShadow:
                "0 0 6px rgba(255, 210, 120, 0.9), 0 0 18px rgba(255, 190, 90, 0.7)",
            }}
          />
          <h3 style={{ fontWeight: 600, flex: 1 }}>Weather — {day.dateISO}</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close" title="Close">
              ✕
            </button>
          )}
        </div>
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}></div>
              <Row
                label="Temp (mean/min/max)"
                value={`${day.tMeanC.toFixed(1)}°C`}
                sub={`${day.tMinC.toFixed(1)}°C / ${day.tMaxC.toFixed(1)}°C`}
              />
              <Row
                label="Precipitation"
                value={day.precipMm.toFixed(1)}
                unit="mm"
              />
              <Row
                label="ET₀ (FAO)"
                value={day.et0Mm != null ? day.et0Mm.toFixed(1) : "—"}
                unit="mm"
              />

              {onIrrigate && (
                <div style={{ marginTop: 8 }}>
                  <button className="button" onClick={() => onIrrigate(5)} style={style}>
                    Irrigate +5 mm
                  </button>
                  <button className="button" onClick={() => onIrrigate(10)} style={style}>
                    +10 mm
                  </button>
                </div>
              )}
            </div>
          </div>
  );
}

function Row({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number | undefined | null;
  unit?: string;
  sub?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ color: "#4b5563" }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600 }}>
          {value != null && value !== "" ? value : "—"} {unit ?? ""}
        </div>
        {sub ? <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div> : null}
      </div>
    </div>
  );
}