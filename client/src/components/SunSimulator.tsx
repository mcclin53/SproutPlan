// SunSimulator.tsx
import React, { useMemo } from "react";
import { createPortal } from "react-dom";

type SunData = {
  solarElevation: number;   // deg
  screenAzimuth: number;    // 0=N, 90=E, 180=S, 270=W
};

interface SunSimulatorProps {
  sunData: SunData | null | undefined;
  fullScreen?: boolean;         // portal + fixed overlay
  hideAtNight?: boolean;
  zIndex?: number;

  // 💡 Strength controls
  intensityMultiplier?: number; // scales with elevation (default 1.15)
  power?: number;               // curve: <1 = brighter at low sun (default 0.7)
  baseBoost?: number;           // extra baseline boost 0..1 (default 0.1)
  opacityMax?: number;          // cap for overall opacity (default 0.85)

  beamStrength?: number;        // directional rim scaler (default 1.2)
  glowStrength?: number;        // global glow scaler (default 1.1)
  vignetteStrength?: number;    // edge dimming scaler (default 0.6)

  mode?: "screen" | "normal";   // blend mode (default "screen")
}

export default function SunSimulator({
  sunData,
  fullScreen = false,
  hideAtNight = true,
  zIndex = 2147483000,

  intensityMultiplier = 1.15,
  power = 0.7,
  baseBoost = 0.1,
  opacityMax = 0.85,

  beamStrength = 1.2,
  glowStrength = 1.1,
  vignetteStrength = 0.6,

  mode = "screen",
}: SunSimulatorProps) {
  const style = useMemo(() => {
    if (!sunData) return { display: "none" } as React.CSSProperties;

    const elev = sunData.solarElevation ?? 0;
    const azRaw = sunData.screenAzimuth ?? 180;
    const az = ((azRaw) + 360) % 360;

    if (hideAtNight && elev <= 0) return { display: "none" } as React.CSSProperties;

    // Base irradiance proxy from elevation
    const elevRad = (Math.max(0, elev) * Math.PI) / 180;
    let base = Math.sin(elevRad);                    // 0..1
    base = Math.pow(base, power);                    // curve: <1 brightens low sun
    const intensity = Math.max(0, Math.min(1, base * intensityMultiplier + baseBoost));

    // Anchor rim along bottom edge (south), slide left->right by azimuth
    const azShift = (az - 90 + 360) % 360;                // 0..360, with 0 = East
    const alongBottom = Math.max(0, Math.min(180, azShift)); // clamp to [0..180]
    const pos = 1 - (alongBottom / 180);                  // 1 = right, 0 = left
    const anchorX = `${Math.round(pos * 100)}%`;
    const anchorY = `100%`; // stays at bottom (south)

    // Layer alphas (scaled)
    const globalAlpha  = (0.04 + 0.12 * intensity) * glowStrength;
    const rimAlpha     = (0.08 + 0.25 * intensity) * beamStrength;
    const rimFalloff   = (0.02 + 0.10 * intensity) * beamStrength * 0.8;

    // Vignette softer at low sun
    const lowSunFactor = Math.min(1, Math.sin(elevRad) * 2);
    const vignette = (1 - intensity) * 0.24 * vignetteStrength * lowSunFactor;

    const beamColor = "rgba(255, 220, 150,";  // warm golden beam
    const glowColor = "rgba(255, 235, 180,";  // softer global glow

    
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

    const baseStyle: React.CSSProperties = {
      pointerEvents: "none",
      zIndex,
      mixBlendMode: mode, // "screen" (brighten) or "normal" (raw opacity)
      backgroundImage: `${bottomRim}, ${globalGlow}, ${edgeVignette}`,
      opacity: overallOpacity,
      transition: "background-image 200ms ease, opacity 200ms ease",
    };

    return fullScreen
      ? ({ ...baseStyle, position: "fixed", inset: 0 } as React.CSSProperties)
      : ({ ...baseStyle, position: "absolute", inset: 0 } as React.CSSProperties);
  }, [
    sunData, fullScreen, hideAtNight, zIndex,
    intensityMultiplier, power, baseBoost, opacityMax,
    beamStrength, glowStrength, vignetteStrength, mode
  ]);

  const overlay = <div aria-hidden="true" style={style} />;

  if (fullScreen && typeof document !== "undefined") {
    return createPortal(overlay, document.body);
  }
  return overlay;
}
