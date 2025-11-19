import React from "react";
import type { StressOverrides } from "../utils/types";
import { Row } from "./common/Row"; // reuse your Row component

interface AdminStressPanelProps {
  overrides: StressOverrides;
  onChange: (next: StressOverrides) => void;
  isAdmin: boolean; // you can wire this from your me/profile query
}

export function AdminStressPanel({
  overrides,
  onChange,
  isAdmin,
}: AdminStressPanelProps) {
  if (!isAdmin) return null;

  const setEnabled = (enabled: boolean) =>
    onChange({
      ...overrides,
      enabled,
    });

  const setTemp = (v: string) =>
    onChange({
      ...overrides,
      tempC: v === "" ? null : Number(v),
    });

  const setSoil = (v: string) =>
    onChange({
      ...overrides,
      soilMoisture: v === "" ? null : Number(v),
    });

  return (
    <div className="card-shell stat-card" style={{ maxWidth: 260 }}>
      <h3>Admin: Stress Overrides</h3>

      <Row
        label="Override weather"
        value={
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={overrides.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Enabled</span>
          </label>
        }
      />

      <Row
        label="Temp override"
        sub="°C (applies to all 24h)"
        value={
          <input
            type="number"
            value={overrides.tempC ?? ""}
            onChange={(e) => setTemp(e.target.value)}
            style={{ width: "100%" }}
            disabled={!overrides.enabled}
          />
        }
      />

      <Row
        label="Dryness override"
        sub="Soil moisture (mm)"
        value={
          <input
            type="number"
            step="0.01"
            value={overrides.soilMoisture ?? ""}
            onChange={(e) => setSoil(e.target.value)}
            style={{ width: "100%" }}
            disabled={!overrides.enabled}
          />
        }
      />

      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
        When enabled, these values override real weather for death checks.
      </div>
    </div>
  );
}
