import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { SET_USER_LOCATION } from "../utils/mutations";
import { QUERY_ME } from "../utils/queries";

type GeoHit = {
  id: string;
  name?: string;
  city?: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  latitude: number;
  longitude: number;
  label: string;
};

async function geocodePlace(q: string): Promise<GeoHit[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q
  )}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data?.results || []) as any[];
  return results.map((r) => {
    const labelParts = [
      r.city || r.name,
      r.admin1,
      r.country,
    ].filter(Boolean);
    return {
      id: String(r.id ?? `${r.latitude},${r.longitude}`),
      name: r.name,
      city: r.city,
      admin1: r.admin1,
      admin2: r.admin2,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
      label: labelParts.join(", "),
    } as GeoHit;
  });
}

export default function LocationControls() {
  // read current status
  const { data, startPolling, stopPolling, refetch } = useQuery(QUERY_ME, {
    fetchPolicy: "cache-and-network",
  });

  const me = data?.me;
  const climoStatus: string | undefined = me?.climoStatus;
  const hasLocation = typeof me?.homeLat === "number" && typeof me?.homeLon === "number";

  const [setUserLocation, { loading: setLocLoading }] = useMutation(SET_USER_LOCATION, {
    onCompleted: () => {
      // begin polling me to watch climoStatus flip to "ready"
      startPolling(4000);
      // re-fetch immediately too
      refetch();
    },
  });

  // stop polling when ready
  useEffect(() => {
    if (climoStatus === "ready") stopPolling();
  }, [climoStatus, stopPolling]);

  // manual search
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchErr(null);
    setSearching(true);
    try {
      const out = await geocodePlace(query.trim());
      setHits(out);
    } catch (err: any) {
      setSearchErr(err?.message || "Search failed");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  async function pickPlace(hit: GeoHit) {
    await setUserLocation({ variables: { lat: hit.latitude, lon: hit.longitude } });
  }

  async function enableLocation() {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      await setUserLocation({
        variables: { lat: pos.coords.latitude, lon: pos.coords.longitude },
      });
    } catch (e) {
      alert("Unable to get your device location. Try manual city/ZIP search.");
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-content">
        <span className="card-title">Garden Location</span>

        <p style={{ marginBottom: 8 }}>
          {hasLocation ? (
            <>
              <strong>Location set</strong> — status:{" "}
              <strong>{climoStatus || "idle"}</strong>
              {climoStatus === "building" && " (preparing climate normals…)"}
              {climoStatus === "ready" && " (ready!)"}
            </>
          ) : (
            "No location set yet."
          )}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={enableLocation} disabled={setLocLoading}>
            {setLocLoading ? "Saving…" : "Enable Location"}
          </button>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Enter city or ZIP"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button className="btn" type="submit" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
        </div>

        {searchErr && <p style={{ color: "red", marginTop: 8 }}>{searchErr}</p>}

        {hits.length > 0 && (
          <ul style={{ marginTop: 10 }}>
            {hits.map((h) => (
              <li key={h.id} style={{ marginBottom: 6 }}>
                <button
                  className="btn"
                  onClick={() => pickPlace(h)}
                  style={{ marginRight: 8 }}
                >
                  Use this
                </button>
                <span>{h.label || `${h.latitude.toFixed(3)}, ${h.longitude.toFixed(3)}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
