import React from "react";

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

  // Future extensibility:
  // soilType?: "Loam" | "Sandy loam" | ...
  // nutrientsNeeded?: { N?: string; P?: string; K?: string };
  // mulchType?: string;
  // companions?: string[]; // plant names in this bed that are companions
  // enemies?: string[];    // plant names in this bed that are enemies
};

export default function BedStats({
  bedId,
  bedLabel,
  soil,
  waterEff,
  waterMin,
  waterMax,
  onClose,
}: Props) {
  return (
    <div style={shell}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <div
              style={{
                fontWeight: 600,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {bedLabel ?? `Bed ${bedId.slice(-4)}`}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Bed ID: {bedId}</div>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" style={closeBtn} title="Close">
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

const shell: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: 16,
  transform: "translateY(-50%)",
  zIndex: 60,
  width: 320,
  maxWidth: "90vw",
  pointerEvents: "auto",
};

const card: React.CSSProperties = {
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

// Optional helper to later add NPK:
// function formatNPK(n?: { N?: string; P?: string; K?: string }) {
//   if (!n) return "—";
//   const parts = [];
//   if (n.N) parts.push(`N: ${n.N}`);
//   if (n.P) parts.push(`P: ${n.P}`);
//   if (n.K) parts.push(`K: ${n.K}`);
//   return parts.length ? parts.join(" · ") : "—";
// }
