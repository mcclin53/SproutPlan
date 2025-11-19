import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_PLANT } from "../utils/mutations";
import { QUERY_ME } from "../utils/queries";
import { useBaseGrowthRate } from "../hooks/useBaseGrowthRate";
import { Row } from "./common/Row";
import { useDragComponent } from "../hooks/useDragComponent";
import { dragConfigFrom } from "../utils/dragConfig";

interface AdminPlantFormProps {
  onCreated?: () => void;
  initialPos?: { x: number; y: number };
  z?: number;
  grid?: { x: number; y: number };
  persistKeyPrefix?: string;
  onClose?: () => void;
}

export const AdminPlantForm: React.FC<AdminPlantFormProps> = ({ onCreated,
  initialPos,
  z,
  grid,
  persistKeyPrefix = "AdminPlantForm@",
  onClose,
 }) => {
  // check admin
  const { data: meData, loading: meLoading } = useQuery(QUERY_ME);
  const me = meData?.me;
  const isAdmin = me?.role === "admin";

  const persistKey = `${persistKeyPrefix}${me?._id ?? "anon"}`;
  const { rootRef, handleRef, style } = useDragComponent(
    dragConfigFrom({
      persistKey,
      initialPos,
      z,
      grid,
    })
  );

  const [createPlant, { loading: saving, error: saveError }] =
    useMutation(CREATE_PLANT);

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [maxHeight, setMaxHeight] = useState<number | "">(30);
  const [maxCanopyRadius, setMaxCanopyRadius] = useState<number | "">("");
  const [daysToHarvest, setDaysToHarvest] = useState<string>("");
  const [sunReq, setSunReq] = useState<number | "">(8);
  const [waterMin, setWaterMin] = useState<number | "">("");
  const [waterMax, setWaterMax] = useState<number | "">("");
  const [tempMin, setTempMin] = useState<number | "">("");
  const [tempMax, setTempMax] = useState<number | "">("");
  const [spacing, setSpacing] = useState<number | "">("");
  const [comments, setComments] = useState("");
  const [kcInitial, setKcInitial] = useState<number | "">("");
  const [kcMid, setKcMid] = useState<number | "">("");
  const [kcLate, setKcLate] = useState<number | "">("");

  // compute baseGrowthRate from maxHeight + daysToHarvest
  const baseGrowthRate = useBaseGrowthRate(
    typeof maxHeight === "number" ? maxHeight : null,
    daysToHarvest
  );

  if (meLoading) {
    return (
    <div ref={rootRef} className="card-shell stat-card" style={style}>
      <div
        ref={handleRef}
        className="card-header"
        style={{ cursor: "move", marginBottom: 8 }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Add Plant (Admin)</h2>
      </div>
      <div>Loading...</div>
    </div>
  );
}
  if (!isAdmin) {
    return (
    <div ref={rootRef} className="card-shell stat-card" style={style}>
      <div
        ref={handleRef}
        className="card-header"
        style={{ cursor: "move", marginBottom: 8 }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Add Plant (Admin)</h2>
      </div>
      <div>You must be an admin to add plants.</div>
    </div>
  );
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const maxHeightNum =
      typeof maxHeight === "number" ? maxHeight : Number(maxHeight) || undefined;

    const maxCanopyRadiusNum =
      typeof maxCanopyRadius === "number"
        ? maxCanopyRadius
        : Number(maxCanopyRadius) || undefined;

    const sunReqNum =
      typeof sunReq === "number" ? sunReq : Number(sunReq) || undefined;

    const input: any = {
      name: name.trim(),
      image: image.trim() || undefined,
      maxHeight: maxHeightNum,
      maxCanopyRadius: maxCanopyRadiusNum,
      sunReq: sunReqNum,
      daysToHarvest: daysToHarvest.trim() || undefined,
      baseGrowthRate: baseGrowthRate ?? undefined,
      waterMin:
        typeof waterMin === "number" ? waterMin : Number(waterMin) || undefined,
      waterMax:
        typeof waterMax === "number" ? waterMax : Number(waterMax) || undefined,
      tempMin:
        typeof tempMin === "number" ? tempMin : Number(tempMin) || undefined,
      tempMax:
        typeof tempMax === "number" ? tempMax : Number(tempMax) || undefined,
      spacing:
        typeof spacing === "number" ? spacing : Number(spacing) || undefined,
      comments: comments.trim() || undefined,

      kcInitial:
        typeof kcInitial === "number"
          ? kcInitial
          : Number(kcInitial) || undefined,
      kcMid:
        typeof kcMid === "number" ? kcMid : Number(kcMid) || undefined,
      kcLate:
        typeof kcLate === "number" ? kcLate : Number(kcLate) || undefined,
    };

    try {
      await createPlant({ variables: { input } });
      if (onCreated) onCreated();

      setName("");
      setImage("");
      setMaxHeight(30);
      setMaxCanopyRadius(30);
      setDaysToHarvest("");
      setSunReq(8);
      setWaterMin("");
      setWaterMax("");
      setTempMin("");
      setTempMax("");
      setSpacing("");
      setComments("");
      setKcInitial("");
      setKcMid("");
      setKcLate("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      ref={rootRef}
      className="card-shell stat-card"
      style={{
        position: "absolute",
        ...style,
      }}
    >
      <div
        ref={handleRef}
        className="card-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "move",
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Add Plant (Admin)</h2>
        {onClose && (
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        )}
      </div>
    <form onSubmit={handleSubmit}>
       <Row
          label="Name"
          value={
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Image URL"
          value={
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Max height"
          sub="Visual height at full maturity"
          value={
            <input
              type="number"
              value={maxHeight}
              onChange={(e) =>
                setMaxHeight(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Max canopy radius"
          sub="Used for shading & spacing"
          value={
            <input
              type="number"
              value={maxCanopyRadius}
              onChange={(e) =>
                setMaxCanopyRadius(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Days to maturity / harvest"
          value={
            <input
              value={daysToHarvest}
              onChange={(e) => setDaysToHarvest(e.target.value)}
              placeholder="e.g. 55 or 60–70"
              style={{ width: "100%" }}
            />
          }
        />

        <div style={{ margin: "12px 0" }}>
          <strong>Base growth rate (computed): </strong>
          {baseGrowthRate != null
            ? `${baseGrowthRate.toFixed(3)} height-units/day`
            : "— enter max height and days to maturity"}
        </div>

        <hr />

        <Row
          label="Sun requirement"
          sub="Hours of full sun per day"
          value={
            <input
              type="number"
              value={sunReq}
              onChange={(e) =>
                setSunReq(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Water Min"
          sub="Lower bound of ideal soil moisture (mm)"
          value={
            <input
              type="number"
              value={waterMin}
              onChange={(e) =>
                setWaterMin(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Water Max"
          sub="Upper bound of ideal soil moisture (mm)"
          value={
            <input
              type="number"
              value={waterMax}
              onChange={(e) =>
                setWaterMax(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Temp Min (°C)"
          value={
            <input
              type="number"
              value={tempMin}
              onChange={(e) =>
                setTempMin(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Temp Max (°C)"
          value={
            <input
              type="number"
              value={tempMax}
              onChange={(e) =>
                setTempMax(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Spacing"
          sub="Same units as your bed grid"
          value={
            <input
              type="number"
              value={spacing}
              onChange={(e) =>
                setSpacing(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <hr />

        <h3>Water use (Kc)</h3>

        <Row
          label="Kc Initial"
          sub="Seedling / early growth (e.g. 0.4–0.7)"
          value={
            <input
              type="number"
              step="0.01"
              value={kcInitial}
              onChange={(e) =>
                setKcInitial(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Kc Mid"
          sub="Peak growth (e.g. 1.0–1.2)"
          value={
            <input
              type="number"
              step="0.01"
              value={kcMid}
              onChange={(e) =>
                setKcMid(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Kc Late"
          sub="Late season / ripening (e.g. 0.7–0.95)"
          value={
            <input
              type="number"
              step="0.01"
              value={kcLate}
              onChange={(e) =>
                setKcLate(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={{ width: "100%" }}
            />
          }
        />

        <Row
          label="Comments / notes"
          value={
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              style={{ width: "100%" }}
            />
          }
        />

        {saveError && (
          <p style={{ color: "red" }}>
            Error saving plant: {saveError.message}
          </p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create plant"}
        </button>
      </form>
    </div>
  );
};