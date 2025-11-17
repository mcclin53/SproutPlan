import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_PLANT } from "../utils/mutations";
import { QUERY_ME } from "../utils/queries";
import { useBaseGrowthRate } from "../hooks/useBaseGrowthRate";
import { Row } from "./common/Row";

interface AdminPlantFormProps {
  onCreated?: () => void;
}

export const AdminPlantForm: React.FC<AdminPlantFormProps> = ({ onCreated }) => {
  // check admin
  const { data: meData, loading: meLoading } = useQuery(QUERY_ME);
  const me = meData?.me;
  const isAdmin = me?.role === "admin";

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

  // compute baseGrowthRate from maxHeight + daysToHarvest
  const baseGrowthRate = useBaseGrowthRate(
    typeof maxHeight === "number" ? maxHeight : null,
    daysToHarvest
  );

  if (meLoading) return <div>Loading...</div>;
  if (!isAdmin) return <div>You must be an admin to add plants.</div>;

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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-shell, stat-card">
      <h2>Add Plant (Admin)</h2>

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
            setSunReq(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
          style={{ width: "100%" }}
        />
      }
    />

    <Row
      label="Water Min"
      sub="Lower bound of ideal soil moisture"
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
      sub="Upper bound of ideal soil moisture"
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
  );
};
