import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { CREATE_PLANT } from "../utils/mutations";
import { QUERY_ME } from "../utils/queries";
import { useBaseGrowthRate } from "../hooks/useBaseGrowthRate";

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
    const sunReqNum =
      typeof sunReq === "number" ? sunReq : Number(sunReq) || undefined;

    const input: any = {
      name: name.trim(),
      image: image.trim() || undefined,
      maxHeight: maxHeightNum,
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

      <label>
        Name*
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label>
        Image URL
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://..."
        />
      </label>

      <label>
        Max height (same units as garden)
        <input
          type="number"
          value={maxHeight}
          onChange={(e) =>
            setMaxHeight(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Days to maturity / harvest
        <input
          value={daysToHarvest}
          onChange={(e) => setDaysToHarvest(e.target.value)}
          placeholder="e.g. 60-70"
        />
      </label>

      <div>
        <strong>Base growth rate (computed): </strong>
        {baseGrowthRate != null
          ? `${baseGrowthRate.toFixed(3)} height-units/day`
          : "— enter max height and days to maturity"}
      </div>

      <hr />

      <label>
        Sun requirement (hours/day)
        <input
          type="number"
          value={sunReq}
          onChange={(e) =>
            setSunReq(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Water Min
        <input
          type="number"
          value={waterMin}
          onChange={(e) =>
            setWaterMin(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Water Max
        <input
          type="number"
          value={waterMax}
          onChange={(e) =>
            setWaterMax(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Temp Min (°C)
        <input
          type="number"
          value={tempMin}
          onChange={(e) =>
            setTempMin(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Temp Max (°C)
        <input
          type="number"
          value={tempMax}
          onChange={(e) =>
            setTempMax(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Spacing (same units as bed grid)
        <input
          type="number"
          value={spacing}
          onChange={(e) =>
            setSpacing(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </label>

      <label>
        Comments / notes
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </label>

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
