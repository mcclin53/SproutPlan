import React, { useState } from "react";
import { useWeather } from "../hooks/useWeather";
import { useDragComponent } from "../hooks/useDragComponent";
import { dragConfigFrom } from "../utils/dragConfig";

type Props = {
  lat: number;
  lon: number;
  simDate?: Date;
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
    simDate,
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

  // If no simDate is provided, anchor the weather fetch to the time the user loaded the page
  const [anchorDate] = useState(() => new Date());
  const targetDate = simDate ?? anchorDate;

  const { day, hourly, loading, error } = useWeather(lat, lon, targetDate);

  if (loading) {
    return (
      <div className="card-shell" ref={rootRef} style={style}>
        <div className="stat-card">
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

  // Build rows
  const rows = (() => {
    if (!hourly) return [];
    const N = Math.min(24, hourly.timeISO.length);
    const out = [];
    for (let i = 0; i < N; i++) {
      out.push({
        ts: hourly.timeISO[i],
        tempC: hourly.tempC[i],
        tempF: cToF(hourly.tempC[i]),
        precipMm: hourly.precipMm?.[i],
        et0Mm: hourly.et0Mm?.[i],
      });
    }
    return out;
  })();

  return (
    <div className="card-shell" ref={rootRef} style={style}>
      <div className="stat-card">
        <div
          ref={handleRef as React.MutableRefObject<HTMLDivElement>}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "move", marginBottom: 8 }}
        >
          <div
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #fffad1 0%, #ffd27a 55%, #ffb32a 100%)",
              boxShadow:  "0 0 6px rgba(255, 210, 120, 0.9), 0 0 18px rgba(255, 190, 90, 0.7)",
              marginRight: 8
            }}
          />
          <h3 style={{ fontWeight: 600, flex: 1 }}>Weather — {day.dateISO}</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close" title="Close">
              ✕
            </button>
          )}
        </div>

        {/* Daily summary */}
        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
          <Row
            label="Temp (mean/min/max)"
            value={`${day.tMeanC.toFixed(1)}°C (${cToF(day.tMeanC).toFixed(1)}°F)`}
            sub={`${day.tMinC.toFixed(1)}°C / ${day.tMaxC.toFixed(1)}°C  ` +
                 `(${cToF(day.tMinC).toFixed(1)}°F / ${cToF(day.tMaxC).toFixed(1)}°F)`}
          />
          <Row label="Precipitation" value={day.precipMm.toFixed(1)} unit="mm" />
          <Row label="ET₀ (FAO)" value={day.et0Mm != null ? day.et0Mm.toFixed(1) : "—"} unit="mm" />
        </div>

        {/* Hourly list */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Hourly (next 24)</div>
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              maxHeight: 240,
              overflow: "auto"
            }}
          >
            <HeaderRow />
            {rows.length ? rows.map((h) => <HourRow key={h.ts} hour={h} />) : (
              <div style={{ padding: "8px 10px", fontSize: 13, color: "#6b7280" }}>
                No hourly data.
              </div>
            )}
          </div>
        </div>

        {onIrrigate && (
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button className="button" onClick={() => onIrrigate(5)}>Irrigate +5 mm</button>
            <button className="button" onClick={() => onIrrigate(10)}>+10 mm</button>
          </div>
        )}
      </div>
    </div>
  );
}

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

function HeaderRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "94px 1fr 1fr 1fr",
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 600,
        background: "rgba(0,0,0,0.03)",
        position: "sticky",
        top: 0
      }}
    >
      <div>Time</div>
      <div style={{ textAlign: "right" }}>Temp (°C)</div>
      <div style={{ textAlign: "right" }}>Temp (°F)</div>
      <div style={{ textAlign: "right" }}>Precip (mm)</div>
      <div style={{ textAlign: "right" }}>ET₀ (mm)</div>
    </div>
  );
}

function HourRow({
  hour,
}: {
  hour: { ts: string; tempC: number; tempF: number; precipMm?: number; et0Mm?: number };
}) {
  const d = new Date(hour.ts);
  const hh = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "94px 1fr 1fr 1fr",
        padding: "6px 10px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        fontSize: 13,
      }}
    >
      <div>{hh}</div>
      <div style={{ textAlign: "right", fontWeight: 600 }}>{fixedOrDash(hour.tempC, 1)}</div>
      <div style={{ textAlign: "right" }}>{fixedOrDash(hour.tempF, 1)}</div>
      <div style={{ textAlign: "right" }}>{fixedOrDash(hour.precipMm, 1)}</div>
      <div style={{ textAlign: "right" }}>{fixedOrDash(hour.et0Mm, 2)}</div>
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

function fixedOrDash(n: number | null | undefined, places = 1) {
  return n == null ? "—" : (typeof n === "number" ? n.toFixed(places) : "—");
}
