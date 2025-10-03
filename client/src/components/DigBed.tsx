import { useState } from "react";
import { useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { CREATE_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries";
import PlantSelector from "./SelectPlant";

export default function DigBed() {
  const [width, setWidth] = useState(0);
  const [length, setLength] = useState(0);
  const [plants, setPlants] = useState<string[]>([]);

  const [createBed, { loading, error }] = useMutation(CREATE_BED, {
    refetchQueries: [{ query: GET_BEDS }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBed({ variables: { width, length, plants } });
    setWidth(0);
    setLength(0);
    setPlants([]);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Width:
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
      </label>
      <br />
      <label>
        Length:
        <input
          type="number"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
        />
      </label>
      <br />
      <PlantSelector selectedPlants={plants} onChange={setPlants} />

      <button type="submit" disabled={loading}>
        {loading ? "Digging..." : "Dig Bed"}
      </button>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </form>
  );
}