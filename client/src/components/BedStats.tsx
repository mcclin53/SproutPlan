import React, { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { useDragComponent } from "../hooks/useDragComponent";
import { dragConfigFrom } from "../utils/dragConfig";

type SoilLike = {
  moistureMm: number;
  capacityMm: number;
};

type Props = {
  bedId: string;
  bedLabel?: string; // optional display name ("Bed A", etc.)
  soil: SoilLike;
  waterEff: number;  // 0..1
  waterMin: number;  // mm (comfort band lower)
  waterMax: number;  // mm (comfort band upper)
  onClose?: () => void;
  initialPos?: { x: number; y: number };
  z?: number;
  grid?: { x: number; y: number };
  persistKeyPrefix?: string;

  // Future extensibility:
  // soilType?: "Loam" | "Sandy loam" | ...
  // nutrientsNeeded?: { N?: string; P?: string; K?: string };
  // mulchType?: string;
  // companions?: string[]; // plant names in this bed that are companions
  // enemies?: string[];    // plant names in this bed that are enemies
};

export default function BedStats(props: Props) {
    const {
        bedId,
        bedLabel,
        soil,
        waterEff,
        waterMin,
        waterMax,
        onClose,
        initialPos,
        z,
        grid,
        persistKeyPrefix = "BedStats@",
    } = props;

    const { rootRef, handleRef, style } = useDragComponent(
        dragConfigFrom({
          persistKey: `${persistKeyPrefix}${bedId}`,
          initialPos: initialPos ?? { x: 16, y: Math.max(16, window.innerHeight / 2 - 180) },
          z: z ?? 51,
          grid: grid ?? { x: 1, y: 1 },
        })
      );

  return (
    <div className="card-shell" ref={rootRef} style={style}>
      <div className="stat-card" ref={handleRef as React.MutableRefObject<HTMLDivElement>}>
        {/* Header */}
        <div 
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "move" }}>
          <div
            style={{
              height: 48,
              width: 48,
              borderRadius: 10,
              background: "#f3f4f6",
              color: "#9ca3af",
              display: "grid",
              placeContent: "center",
              fontSize: 20,
              border: "1px solid #e5e7eb",
            }}
            title="Bed"
          >
            🛏️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {bedLabel ?? `Bed ${bedId.slice(-4)}`}
            </h3>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Bed ID: {bedId}</div>
          </div>
          {onClose && (
            <button className="close-btn" onClick={onClose} aria-label="Close" title="Close">
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
          <Row
            label="Soil"
            value={`${soil.moistureMm.toFixed(1)} / ${soil.capacityMm.toFixed(0)}`}
            sub="mm moisture / capacity"
          />
          <Row
            label="Water efficiency"
            value={waterEff.toFixed(2)}
            sub="bed-level (0–1)"
          />
          <Row
            label="Comfort band"
            value={`${Math.round(waterMin)}–${Math.round(waterMax)} mm`}
            sub="growth-friendly moisture range"
          />

          {/* Future sections (keep placeholders commented for now)
          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "8px 0" }} />
          <Row label="Soil type" value={soilType ?? "—"} />
          <Row label="Nutrients needed" value={formatNPK(nutrientsNeeded)} />
          <Row label="Mulch" value={mulchType ?? "—"} />
          <Row label="Companions" value={companions?.join(", ") || "—"} />
          <Row label="Enemies" value={enemies?.join(", ") || "—"} />
          */}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ color: "#4b5563" }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600 }}>{value}</div>
        {sub ? <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div> : null}
      </div>
    </div>
  );
}

// Optional helper to later add NPK:
// function formatNPK(n?: { N?: string; P?: string; K?: string }) {
//   if (!n) return "—";
//   const parts = [];
//   if (n.N) parts.push(`N: ${n.N}`);
//   if (n.P) parts.push(`P: ${n.P}`);
//   if (n.K) parts.push(`K: ${n.K}`);
//   return parts.length ? parts.join(" · ") : "—";
// }
