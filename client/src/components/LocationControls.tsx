import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { SET_USER_LOCATION, CLEAR_USER_LOCATION } from "../utils/mutations";
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

function formatHitLabel(r: any) {
  const labelParts = [r.city || r.name, r.admin1, r.country].filter(Boolean);
  return labelParts.join(", ");
}

async function geocodePlace(q: string): Promise<GeoHit[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data?.results || []) as any[];
  return results.map((r) => ({
    id: String(r.id ?? `${r.latitude},${r.longitude}`),
    name: r.name,
    city: r.city,
    admin1: r.admin1,
    admin2: r.admin2,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    label: formatHitLabel(r),
  }));
}

export default function LocationControls() {
  const { data, loading, startPolling, stopPolling } = useQuery(QUERY_ME, {
    fetchPolicy: "network-only",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: true,
  });

  const me = data?.me;
  const climoStatus: string | undefined = me?.climoStatus;
  const hasLocation =
    Number.isFinite(me?.homeLat) && Number.isFinite(me?.homeLon);

  const [setUserLocation, { loading: setLocLoading }] = useMutation(SET_USER_LOCATION, {
    // Write result directly into QUERY_ME
    update(cache, { data }) {
      const updated = data?.setUserLocation;
      if (!updated) return;
      cache.writeQuery({
        query: QUERY_ME,
        data: { me: updated },
      });
    },
    onCompleted() {
      startPolling(4000);
    },
    onError(err) {
      console.error("setUserLocation error:", {
      graphQLErrors: err.graphQLErrors,
      networkError: err.networkError,
      message: err.message,
      });
    },
  });

  const [clearUserLocation, { loading: clearLoading }] = useMutation(CLEAR_USER_LOCATION, {
    update(cache, { data }) {
      const updated = data?.clearUserLocation;
      if (!updated) return;
      cache.writeQuery({ query: QUERY_ME, data: { me: updated } });
    },
    onCompleted() {
      stopPolling();
    },
  });

  useEffect(() => {
    if (climoStatus === "ready") stopPolling();
  }, [climoStatus, stopPolling]);

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
    setHits([]);
    setQuery("");
  
  }

  async function enableLocation() {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const lat = pos?.coords?.latitude;
    const lon = pos?.coords?.longitude;
    console.log("enableLocation vars:", { lat, lon, finite: Number.isFinite(lat) && Number.isFinite(lon) });
  
    await setUserLocation({ variables: { lat, lon } });
  } catch (e) {
    console.error("enableLocation failed:", e);
      alert("Unable to get your device location. Try manual city/ZIP search.");
    }
  }

  async function handleClear() {
    try {
      await clearUserLocation();
      setQuery("");
      setHits([]);
    } catch {
      // noop
    }
  }

  const friendly =
    me?.locationLabel ||
    (hasLocation
      ? `${Number(me!.homeLat!).toFixed(3)}, ${Number(me!.homeLon!).toFixed(3)}`
      : null);

      console.log("QUERY_ME me:", me);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-content">
          <p style={{ marginBottom: 8 }}>
          {loading ? (
            "Loading location…"
          ) : friendly ? (
            <>
              <strong>Location:</strong> {friendly} {" — status: "}
              <strong>{climoStatus || "idle"}</strong>
              {climoStatus === "building" && " (preparing climate normals…)"}
              {climoStatus === "ready" && " (ready!)"}
            </>
          ) : (
            "No location set yet."
          )}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {!hasLocation ? (
            <button className="btn" onClick={enableLocation} disabled={setLocLoading || clearLoading} title={hasLocation ? "You already have a saved location" : "Use device location"}>
              {setLocLoading ? "Saving…" : "Enable Location"}
            </button>
          ) : (
            <button className="btn" onClick={handleClear} disabled={clearLoading || setLocLoading} title="Remove saved location and stop polling">
              {clearLoading ? "Clearing…" : "Clear Location"}
            </button>
          )}

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
                <button className="btn" onClick={() => pickPlace(h)} style={{ marginRight: 8 }}>
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
