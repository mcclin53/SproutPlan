// client/src/components/SunSimulator.tsx
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { dragConfigFrom } from "../utils/dragConfig";
import { useDragComponent } from "../hooks/useDragComponent";

type SunData = {
  solarElevation: number;   // deg
  screenAzimuth: number;    // 0=N, 90=E, 180=S, 270=W
  solarAzimuth: number;     // deg 0=S (raw)
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
  daylightDuration: number; // seconds
};

interface SunSimulatorProps {
  sunData: SunData | null | undefined;
  fullScreen?: boolean;          // portal + fixed overlay
  hideAtNight?: boolean;
  zIndex?: number;
  mode?: "screen" | "normal";    // blend mode for glow

  // glow tuning
  intensityMultiplier?: number;  // default 1.15
  power?: number;                // default 0.7
  baseBoost?: number;            // default 0.1
  opacityMax?: number;           // default 0.85
  beamStrength?: number;         // default 1.2
  glowStrength?: number;         // default 1.1
  vignetteStrength?: number;     // default 0.6

  // sun dot
  showDot?: boolean;             // default true
  dotSizePx?: number;            // default 24
  dotZ?: number;                 // default zIndex+1
  onOpenStats?: () => void;      // optional callback when stats opens
}

export default function SunSimulator(props: SunSimulatorProps) {
  const {
    sunData,
    fullScreen = true,
    hideAtNight = true,
    zIndex = 2147483000,
    mode = "screen",

    intensityMultiplier = 1.15,
    power = 0.7,
    baseBoost = 0.1,
    opacityMax = 0.85,
    beamStrength = 1.2,
    glowStrength = 1.1,
    vignetteStrength = 0.6,

    showDot = true,
    dotSizePx = 24,
    dotZ = zIndex + 1,
    onOpenStats,
  } = props;

  const [showStats, setShowStats] = useState(false);

  // ---- GLOW OVERLAY STYLE (pointer-events: none) ----
  const glowStyle = useMemo<React.CSSProperties>(() => {
    if (!sunData) return { display: "none" };
    const elev = sunData.solarElevation ?? 0;
    const azRaw = sunData.screenAzimuth ?? 180; // screen az
    const az = (azRaw + 360) % 360;

    if (hideAtNight && elev <= 0) return { display: "none" };

    const elevRad = (Math.max(0, elev) * Math.PI) / 180;
    let base = Math.sin(elevRad);
    base = Math.pow(base, power);
    const intensity = Math.max(0, Math.min(1, base * intensityMultiplier + baseBoost));

    // Beam anchor along bottom rim (south)
    const azShift = (az - 90 + 360) % 360;           // 0 = east
    const alongBottom = Math.max(0, Math.min(180, azShift));
    const pos = 1 - alongBottom / 180;               // 1 right → 0 left
    const anchorX = `${Math.round(pos * 100)}%`;
    const anchorY = `100%`;

    const globalAlpha = (0.04 + 0.12 * intensity) * glowStrength;
    const rimAlpha = (0.08 + 0.25 * intensity) * beamStrength;
    const rimFalloff = (0.02 + 0.10 * intensity) * beamStrength * 0.8;

    const lowSunFactor = Math.min(1, Math.sin(elevRad) * 2);
    const vignette = (1 - intensity) * 0.24 * vignetteStrength * lowSunFactor;

    const bottomRim = `radial-gradient(
      circle at ${anchorX} ${anchorY},
      rgba(255, 220, 150, ${rimAlpha}) 0%,
      rgba(255, 220, 150, ${rimFalloff}) 24%,
      rgba(255, 244, 200, 0) 62%
    )`;

    const globalGlow = `radial-gradient(
      circle at 50% 65%,
      rgba(255, 235, 180, ${globalAlpha}) 0%,
      rgba(255, 235, 180, ${Math.max(0, globalAlpha - 0.05)}) 36%,
      rgba(255, 255, 240, 0) 82%
    )`;

    const edgeVignette = `radial-gradient(
      circle at 50% 60%,
      rgba(0,0,0,0) 55%,
      rgba(0,0,0,${vignette}) 100%
    )`;

    const overallOpacity = Math.min(opacityMax, 0.25 + 0.6 * intensity);

    return {
      position: fullScreen ? "fixed" : "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex,
      mixBlendMode: mode,
      backgroundImage: `${bottomRim}, ${globalGlow}, ${edgeVignette}`,
      opacity: overallOpacity,
      transition: "background-image 200ms ease, opacity 200ms ease",
    } as React.CSSProperties;
  }, [
    sunData,
    fullScreen,
    hideAtNight,
    zIndex,
    mode,
    intensityMultiplier,
    power,
    baseBoost,
    opacityMax,
    beamStrength,
    glowStrength,
    vignetteStrength,
  ]);

  // ---- SUN DOT POSITION (clickable) ----
  const dotStyle = useMemo<React.CSSProperties>(() => {
    if (!sunData || (hideAtNight && sunData.solarElevation <= 0)) return { display: "none" };

    const elev = Math.max(0, sunData.solarElevation);
    const az = (sunData.screenAzimuth + 360) % 360;

    // Reuse the same bottom-rim anchor math, then lift upward with elevation.
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const azShift = (az - 90 + 360) % 360; // 0=east → 180=west
    const alongBottom = Math.max(0, Math.min(180, azShift));
    const pos = 1 - alongBottom / 180; // 1 right → 0 left
    const x = Math.round(pos * (vw - dotSizePx)) + 0; // padding 0; adjust if needed

    // Height: map elevation (0..90) to 90%..20% of screen height
    const t = Math.min(1, elev / 90);
    const yTop = 0.20 * vh;   // higher at noon
    const yBot = 0.90 * vh;   // near horizon
    const y = Math.round(yBot + (yTop - yBot) * t) - dotSizePx / 2;

    return {
      position: "fixed",
      left: x,
      top: y,
      width: dotSizePx,
      height: dotSizePx,
      borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, #fffad1 0%, #ffd27a 55%, #ffb32a 100%)",
      boxShadow:
        "0 0 12px rgba(255, 210, 120, 0.9), 0 0 28px rgba(255, 190, 90, 0.7), 0 0 48px rgba(255, 170, 60, 0.4)",
      cursor: "pointer",
      zIndex: dotZ,
    } as React.CSSProperties;
  }, [sunData, hideAtNight, dotSizePx, dotZ]);

  // Glow overlay node
  const glow = <div aria-hidden="true" style={glowStyle} />;

  // Sun dot node
  const sunDot =
    showDot && sunData && (!hideAtNight || sunData.solarElevation > 0) ? (
      <button
        type="button"
        style={dotStyle}
        onClick={() => {
          setShowStats(true);
          onOpenStats?.();
        }}
        aria-label="Open sun stats"
      />
    ) : null;

  // Stats card
  const statsCard = showStats && sunData ? (
    <SunStatsCard sunData={sunData} onClose={() => setShowStats(false)} />
  ) : null;

  // Render (glow should be at root; dot + card sit above)
  if (fullScreen && typeof document !== "undefined") {
    return (
      <>
        {createPortal(glow, document.body)}
        {sunDot}
        {statsCard}
      </>
    );
  }
  return (
    <>
      {glow}
      {sunDot}
      {statsCard}
    </>
  );
}

/* ---------- Small draggable stats card ---------- */

function fmtTime(d: Date) {
  try {
    return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}
function fmtNum(x: number | null | undefined, d = 1) {
  return x == null ? "—" : x.toFixed(d);
}

function SunStatsCard({
  sunData,
  onClose,
  initialPos,
  z = 2147483600,
  persistKeyPrefix = "SunStats@",
}: {
  sunData: SunData;
  onClose?: () => void;
  initialPos?: { x: number; y: number };
  z?: number;
  persistKeyPrefix?: string;
}) {
  const { rootRef, handleRef, style } = useDragComponent(
    dragConfigFrom({
      persistKey: `${persistKeyPrefix}${new Date().toDateString()}`, // per-day position
      initialPos: initialPos ?? { x: 16, y: 16 },
      z,
      grid: { x: 1, y: 1 },
    })
  );

  return (
    <div className="card-shell" ref={rootRef} style={style}>
      <div className="stat-card" ref={handleRef as React.MutableRefObject<HTMLDivElement>}>
        {/* Header (drag handle) */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "move" }}
        >
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
          <h3 style={{ fontWeight: 600, flex: 1 }}>Sun</h3>
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 14 }}>
          <Row label="Elevation" value={fmtNum(sunData.solarElevation)} unit="°" />
          <Row label="Azimuth (screen)" value={fmtNum(sunData.screenAzimuth)} unit="°" />
          <Row label="Azimuth (solar)" value={fmtNum(sunData.solarAzimuth)} unit="°" />
          <Row label="Sunrise" value={fmtTime(sunData.sunrise)} />
          <Row label="Solar noon" value={fmtTime(sunData.solarNoon)} />
          <Row label="Sunset" value={fmtTime(sunData.sunset)} />
          <Row
            label="Daylight"
            value={`${Math.floor((sunData.daylightDuration || 0) / 3600)}h ${Math.round(
              ((sunData.daylightDuration || 0) % 3600) / 60
            )}m`}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ color: "#4b5563" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>
        {value} {unit ?? ""}
      </div>
    </div>
  );
}