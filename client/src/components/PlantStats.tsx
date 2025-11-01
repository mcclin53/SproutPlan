import React, { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { GET_GROWTH_SNAPSHOTS } from "../utils/queries";
import { computeWaterComfortBand, guessRootDepthM } from "../utils/waterBand";

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3001";

type BasePlant = {
  _id: string;
  name: string;
  image?: string;
  sunReq?: number;
  baseGrowthRate?: number;
  tempMin?: number;
  tempMax?: number;
  waterMin?: number;
  waterMax?: number;
  maturityDays?: number;
  kcMid?: number;
  kcInitial?: number;
  kcLate?: number;
  kcProfile?: { initial?: number; mid?: number; late?: number };
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
  todaySunHours?: number;
  todayTempOkHours?: number;
  onClose?: () => void;
  liveHeight?: number;
  liveCanopy?: number;
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
  liveCanopy,
  liveHeight,
}: Props) {
  const bp = plant.basePlant || ({} as BasePlant);
  const sunReq = bp.sunReq ?? 8;                 // hours/day for 100% efficiency
  const baseGrowthRate = bp.baseGrowthRate ?? 1; // size units/day @ 100%

  // Image selection
  const [imgFailed, setImgFailed] = useState(false);
  const imageSrc = useMemo(() => {
    if (imgFailed) return `${BASE_URL}/images/placeholder.png`;
    const imgField = bp.image;
    if (!imgField) return `${BASE_URL}/images/placeholder.png`;
    if (imgField.startsWith("http://") || imgField.startsWith("https://")) return imgField;
    if (imgField.startsWith("/")) return `${BASE_URL}${imgField}`;
    return `${BASE_URL}/images/${imgField}`;
  }, [bp.image, imgFailed]);

  // Query snapshots for growth deltas & persisted sunlight
  const { data } = useQuery(GET_GROWTH_SNAPSHOTS, {
    variables: { plantInstanceId: plant._id },
    fetchPolicy: "cache-first",
  });

  const snaps: any[] = data?.growthSnapshots ?? [];
  const earliestSnapshotDay: Date | null = snaps.length ? new Date(snaps[0].day) : null;
  const latest = snaps[snaps.length - 1];
  const previous = snaps[snaps.length - 2];

  const displayHeight =
    (typeof liveHeight === "number" ? liveHeight : latest?.height) ?? plant.height;
  const displayCanopy =
    (typeof liveCanopy === "number" ? liveCanopy : latest?.canopyRadius) ?? plant.canopyRadius;

  const growthDelta = useMemo(() => {
    if (!previous || !latest) return null;
    return (latest.height ?? 0) - (previous.height ?? 0);
  }, [latest, previous]);

  // Days old used for simple stage-aware Kc pick
  const daysOld = useMemo(() => {
    if (plant.plantedAt) {
      const d0 = new Date(plant.plantedAt).getTime();
      const d1 = simulatedDate.getTime();
      return Math.max(0, Math.round((d1 - d0) / (1000 * 60 * 60 * 24)));
    }
    if (earliestSnapshotDay) {
      const d0 = earliestSnapshotDay.getTime();
      const d1 = simulatedDate.getTime();
      return Math.max(0, Math.round((d1 - d0) / (1000 * 60 * 60 * 24)));
    }
    return null;
  }, [plant.plantedAt, earliestSnapshotDay, simulatedDate]);

  // Stage-aware Kc
  const kc = useMemo(() => {
    const prof = bp.kcProfile;
    if (!prof) return bp.kcMid ?? bp.kcLate ?? bp.kcInitial ?? 1.0;

    const md = bp.maturityDays ?? 80;
    const d = daysOld ?? 0;

    if (d < 0.2 * md) return prof.initial ?? bp.kcInitial ?? 0.6;
    if (d > 0.8 * md) return prof.late ?? bp.kcLate ?? 0.8;
    return prof.mid ?? bp.kcMid ?? 1.0;
  }, [bp.kcProfile, bp.kcMid, bp.kcInitial, bp.kcLate, bp.maturityDays, daysOld]);

  //  Computes dynamic water comfort band from Kc × ET0 and soil capacity
  const capacityMm = soil?.capacityMm ?? 60;
  const rootDepthM = guessRootDepthM(bp?.name ?? "");
  const { waterMin: bandMin, waterMax: bandMax } = computeWaterComfortBand({
    kc,
    et0Mm: null,
    capacityMm,
    rootDepthM,
    awcMmPerM: 150,
  });

  // Water efficiency & display
  const wMin = bandMin;
  const wMax = bandMax;

  const waterEff = useMemo(() => {
    if (!soil || wMin >= wMax) return 1;
    const m = soil.moistureMm;
    if (m <= wMin) return 0;
    if (m >= wMax) return 1;
    return (m - wMin) / Math.max(1e-6, wMax - wMin);
  }, [soil, wMin, wMax]);

  const waterStatus = useMemo(() => {
    if (!soil || wMin >= wMax) return "—";
    if (soil.moistureMm < wMin) return "Too little";
    if (soil.moistureMm > wMax) return "Too much";
    return "Just right";
  }, [soil, wMin, wMax]);

  //  Sunlight & temperature effectiveness
  const sunHoursForToday =
    typeof todaySunHours === "number"
      ? todaySunHours
      : typeof latest?.sunlightHours === "number"
      ? latest.sunlightHours
      : undefined;

  const sunEff =
    sunReq > 0 && sunHoursForToday != null ? clamp01(sunHoursForToday / sunReq) : 0;

  const tempEff = clamp01((todayTempOkHours ?? 24) / 24);

  const expectedGrowth = baseGrowthRate * sunEff * waterEff * tempEff;
  const face = growthDelta == null ? "😐" : growthDelta + 1e-6 >= expectedGrowth ? "🙂" : "🙁";

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
            onError={(e) => {
              setImgFailed(true);
              (e.target as HTMLImageElement).src = `${BASE_URL}/images/placeholder.png`;
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
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
          <Row label="Height" value={fmtNum(displayHeight)} unit="units" />
          <Row label="Canopy" value={fmtNum(displayCanopy)} unit="units" />

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

          <Row
            label="Sunlight today"
            value={sunHoursForToday != null ? fmtNum(sunHoursForToday) : "—"}
            unit="h"
          />
          <Row
            label="Temp in range"
            value={todayTempOkHours != null ? fmtNum(todayTempOkHours) : "—"}
            unit="h"
            sub={
              bp.tempMin != null && bp.tempMax != null
                ? `(${bp.tempMin}–${bp.tempMax}°C)`
                : undefined
            }
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#4b5563" }}>Water</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{waterStatus}</div>
              {soil && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {soil.moistureMm.toFixed(0)} / {soil.capacityMm.toFixed(0)} mm
                  {" "}
                  (min {fmtNum(wMin, 0)}, max {fmtNum(wMax, 0)})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
