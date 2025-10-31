// client/src/components/PlantStats.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { GET_GROWTH_SNAPSHOTS } from "../utils/queries";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

type BasePlant = {
  _id: string;
  name: string;
  image?: string;
  sunReq?: number;
  baseGrowthRate?: number;
  tempMin?: number;
  tempMax?: number;
  waterMin?: number; // moisture units you use (e.g., mm)
  waterMax?: number;
};

type PlantInstance = {
  _id: string;
  plantedAt?: string | null;
  height?: number;
  canopyRadius?: number;
  basePlant: BasePlant;
};

type SoilLike = {
  moistureMm: number;
  capacityMm: number;
};

type Props = {
  plant: PlantInstance;
  bedId: string;
  soil?: SoilLike;
  simulatedDate?: Date;
  todaySunHours?: number;       // optional live override
  todayTempOkHours?: number;    // optional live override
  onClose?: () => void;
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function fmtNum(x: number | undefined | null, d = 2) {
  return x == null ? "—" : x.toFixed(d);
}

export default function PlantStats({
  plant,
  bedId,
  soil,
  simulatedDate = new Date(),
  todaySunHours,
  todayTempOkHours,
  onClose,
}: Props) {
  const bp = plant.basePlant || ({} as BasePlant);
  const sunReq = bp.sunReq ?? 8;                 // hours/day for 100% efficiency
  const baseGrowthRate = bp.baseGrowthRate ?? 1; // size units/day @ 100%

  const wMin = bp.waterMin ?? 0;
  const wMax = bp.waterMax ?? (soil?.capacityMm ?? 0);
  const tMin = bp.tempMin;
  const tMax = bp.tempMax;

  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = useMemo(() => {
    if (imgFailed) return `${BASE_URL}/images/placeholder.png`;
    const imgField = bp.image;
    if (!imgField) return `${BASE_URL}/images/placeholder.png`;
    if (imgField.startsWith("http://") || imgField.startsWith("https://")) return imgField;
    if (imgField.startsWith("/")) return `${BASE_URL}${imgField}`;
    // treat as filename under /images
    return `${BASE_URL}/images/${imgField}`;
  }, [bp.image, imgFailed]);

  // Pull snapshots to compute "growth since yesterday" + persisted sunlight hours
  const { data } = useQuery(GET_GROWTH_SNAPSHOTS, {
    variables: { plantInstanceId: plant._id },
    fetchPolicy: "cache-first",
  });

  const snaps: any[] = data?.growthSnapshots ?? [];
  const latest = snaps[snaps.length - 1];
  const previous = snaps[snaps.length - 2];

  const growthDelta = useMemo(() => {
    if (!previous || !latest) return null;
    return (latest.height ?? 0) - (previous.height ?? 0);
  }, [latest, previous]);

  // Prefer live sunlight if provided; else fall back to last snapshot’s sunlightHours
  const sunHoursForToday =
    typeof todaySunHours === "number"
      ? todaySunHours
      : typeof latest?.sunlightHours === "number"
      ? latest.sunlightHours
      : undefined;

  const sunEff = sunReq > 0 && sunHoursForToday != null ? clamp01(sunHoursForToday / sunReq) : 0;

  const waterEff = useMemo(() => {
    if (!soil || wMin >= wMax) return 1; // no data ⇒ neutral
    const m = soil.moistureMm;
    if (m <= wMin) return 0;
    if (m >= wMax) return 1;
    return (m - wMin) / Math.max(1e-6, wMax - wMin);
  }, [soil, wMin, wMax]);

  // If you wire hourly temps, you can compute a fraction-of-day OK; treat as 1 by default
  const tempEff = clamp01((todayTempOkHours ?? 24) / 24);

  const expectedGrowth = baseGrowthRate * sunEff * waterEff * tempEff;
  const face =
    growthDelta == null ? "😐" : growthDelta + 1e-6 >= expectedGrowth ? "🙂" : "🙁";

  const waterStatus = useMemo(() => {
    if (!soil || wMin >= wMax) return "—";
    if (soil.moistureMm < wMin) return "Too little";
    if (soil.moistureMm > wMax) return "Too much";
    return "Just right";
  }, [soil, wMin, wMax]);

  const daysOld = useMemo(() => {
    if (!plant.plantedAt) return null;
    const d0 = new Date(plant.plantedAt).getTime();
    const d1 = simulatedDate.getTime();
    return Math.max(0, Math.round((d1 - d0) / (1000 * 60 * 60 * 24)));
  }, [plant.plantedAt, simulatedDate]);

  return (
    <div style={plantCardShell}>
      <div style={plantCardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
           <img
              src={imageSrc}
              alt={bp.name}
              style={{
                height: 48,
                width: 48,
                borderRadius: 10,
                objectFit: "cover",
                border: "1px solid #e5e7eb",
              }}
            />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {bp.name ?? "Plant"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {daysOld != null ? `${daysOld} days old` : "—"}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" style={closeBtn} title="Close">
              ✕
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
          <Row label="Height" value={fmtNum(plant.height)} unit="units" />
          <Row label="Canopy" value={fmtNum(plant.canopyRadius)} unit="units" />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#4b5563" }}>Growth (vs expected)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>
                {growthDelta == null ? "—" : fmtNum(growthDelta)}
              </span>
              <span style={{ color: "#9ca3af" }}>/</span>
              <span style={{ color: "#6b7280" }}>{fmtNum(expectedGrowth)}</span>
              <span style={{ fontSize: 18 }}>{face}</span>
            </div>
          </div>

          <Row label="Sunlight today" value={sunHoursForToday != null ? fmtNum(sunHoursForToday) : "—"} unit="h" />
          <Row
            label="Temp in range"
            value={todayTempOkHours != null ? fmtNum(todayTempOkHours) : "—"}
            unit="h"
            sub={tMin != null && tMax != null ? `(${tMin}–${tMax}°C)` : undefined}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#4b5563" }}>Water</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{waterStatus}</div>
              {soil && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {soil.moistureMm.toFixed(0)} / {soil.capacityMm.toFixed(0)} mm
                  {Number.isFinite(wMin) && Number.isFinite(wMax) ? ` (min ${wMin}, max ${wMax})` : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline styles (mirrors your Weather card aesthetic) */
const plantCardShell: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: 16,
  transform: "translateY(-50%)",
  zIndex: 50,
  width: 320,
  maxWidth: "90vw",
  pointerEvents: "auto",
};

const plantCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  border: "1px solid #e5e7eb",
  fontSize: 14,
  backdropFilter: "blur(4px)",
};

const closeBtn: React.CSSProperties = {
  color: "#6b7280",
  border: "1px solid #e5e7eb",
  background: "white",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
};

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
