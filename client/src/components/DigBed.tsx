import { useState } from "react";
import { useMutation } from "@apollo/client";
import { CREATE_BED } from "../utils/mutations";

interface DigBedProps {
  onBedCreated: () => void;
}

export default function DigBed({ onBedCreated }: DigBedProps) {
  const [width, setWidth] = useState(0);
  const [length, setLength] = useState(0);

  const [createBed, { loading, error }] = useMutation(CREATE_BED, {
    onCompleted: onBedCreated,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBed({ variables: { width, length } });
    setWidth(0);
    setLength(0);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <label>
        Width:
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
      </label>
      <label style={{ marginLeft: "10px" }}>
        Length:
        <input
          type="number"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
        />
      </label>
      <button  className="button" type="submit" disabled={loading} style={{ marginLeft: "10px" }}>
        {loading ? "Digging..." : "Create Bed"}
      </button>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
    </form>
  );
}
