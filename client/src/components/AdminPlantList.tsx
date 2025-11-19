import React from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_PLANTS, QUERY_ME } from "../utils/queries";
import { DELETE_PLANT } from "../utils/mutations";
import { Row } from "./common/Row";
import { useDragComponent } from "../hooks/useDragComponent";
import { dragConfigFrom } from "../utils/dragConfig";

interface AdminPlantListProps {
  initialPos?: { x: number; y: number };
  z?: number;
  grid?: { x: number; y: number };
  persistKeyPrefix?: string;
  onClose?: () => void;
}

export const AdminPlantList: React.FC<AdminPlantListProps> = ({
  initialPos,
  z,
  grid,
  persistKeyPrefix = "AdminPlantList@",
  onClose,
}) => {
  // who am I?
  const { data: meData, loading: meLoading } = useQuery(QUERY_ME);
  const me = meData?.me || meData?.profile || null;
  const isAdmin = me?.role === "admin";

  // 🔹 draggable setup
  const persistKey = `${persistKeyPrefix}${me?._id ?? "anon"}`;
  const { rootRef, handleRef, style } = useDragComponent(
    dragConfigFrom({
      persistKey,
      initialPos,
      z,
      grid,
    })
  );

  const { data, loading, error, refetch } = useQuery(GET_PLANTS);
  const [deletePlant, { loading: deleting }] = useMutation(DELETE_PLANT);

  if (meLoading) {
    return (
      <div
        ref={rootRef}
        className="card-shell stat-card"
        style={{ position: "absolute", ...style }}
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
          <h3 style={{ margin: 0, fontSize: 16 }}>Admin: Plants</h3>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    // still render card so you can see *something* if things mis-wire
    return null;
  }

  const plants = data?.plants ?? [];

  const handleDelete = async (id: string, name: string) => {
    const ok = window.confirm(
      `Delete plant "${name}" from the database?\n\n` +
        `You must remove any instances of this plant from beds first.`
    );
    if (!ok) return;

    try {
      await deletePlant({ variables: { id } });
      await refetch();
    } catch (err: any) {
      console.error("Delete plant error (raw):", err);

      // GraphQL errors
      if (err?.graphQLErrors?.length) {
        console.error("GraphQL errors:", err.graphQLErrors);
        alert(err.graphQLErrors.map((e: any) => e.message).join("\n"));
        return;
      }

      // Network error details
      const net = err?.networkError as any;
      if (net?.result?.errors?.length) {
        console.error("NetworkError result.errors:", net.result.errors);
        alert(net.result.errors.map((e: any) => e.message).join("\n"));
        return;
      }

      alert(err.message ?? "Error deleting plant");
    }
  };

  return (
    <div
      ref={rootRef}
      className="card-shell stat-card"
      style={{ position: "absolute", ...style, maxWidth: 320 }}
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
        <h3 style={{ margin: 0, fontSize: 16 }}>Admin: Plants</h3>
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

      {loading && <div>Loading plants…</div>}
      {error && (
        <div style={{ color: "red", fontSize: 12 }}>Error: {error.message}</div>
      )}

      {!loading && plants.length === 0 && (
        <div style={{ fontSize: 13 }}>No plants in database.</div>
      )}

      {!loading && plants.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 4,
          }}
        >
          {plants.map((p: any) => (
            <Row
              key={p._id}
              label={p.name}
              sub={`H: ${p.maxHeight ?? "?"}, Canopy: ${
                p.maxCanopyRadius ?? "?"
              }`}
              value={
                <button
                  type="button"
                  onClick={() => handleDelete(p._id, p.name)}
                  disabled={deleting}
                  style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid #b91c1c",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              }
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
        Deletion will fail if the plant is still referenced in any beds.
      </div>
    </div>
  );
};
