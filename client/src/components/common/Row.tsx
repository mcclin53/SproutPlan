import React from "react";

interface RowProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: string;
}

export function Row({ label, value, unit, sub }: RowProps) {
    const isPrimitive =
    typeof value === "string" || typeof value === "number";
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ color: "#4b5563" }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600 }}>
          {isPrimitive ? (
            <>
              {value ?? "—"} {unit ?? ""}
            </>
          ) : (
            value
          )}
        </div>
        {sub ? <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div> : null}
      </div>
    </div>
  );
}