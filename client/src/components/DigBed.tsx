import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import { CREATE_BED } from "../utils/mutations";
import { GET_BEDS } from "../utils/queries";

export default function DigBed() {
  const [width, setWidth] = useState(0);
  const [length, setLength] = useState(0);

  const [createBed, { loading, error }] = useMutation(CREATE_BED, {
    update(cache, { data: { createBed } }) {
      // Add the newly created bed to the cached GET_BEDS query
      cache.modify({
        fields: {
          beds(existingBeds = []) {
            const newBedRef = cache.writeFragment({
              data: createBed,
              fragment: gql`
                fragment NewBed on Bed {
                  _id
                  width
                  length
                  plantInstances {
                    _id
                    basePlant {
                      _id
                      name
                      image
                      waterReq
                      spacing
                    }
                  }
                }
              `,
            });
            return [...existingBeds, newBedRef];
          },
        },
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (width <= 0 || length <= 0) {
      alert("Width and length must be greater than 0");
      return;
    }

    try {
      await createBed({ variables: { width, length } });
      setWidth(0);
      setLength(0);
    } catch (err) {
      console.error("Error creating bed:", err);
    }
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
