import { useCallback, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { SET_USER_LOCATION } from "../utils/mutations";
import { QUERY_ME } from "../utils/queries";

function roundCoord(x: number, places = 3) {
  const k = Math.pow(10, places);
  return Math.round(x * k) / k;
}

export function useBuildClimatology() {
  const [setUserLocation, setUserLocationState] = useMutation(SET_USER_LOCATION, { errorPolicy: "all" });
  const { data, startPolling, stopPolling, refetch } = useQuery(QUERY_ME, { fetchPolicy: "cache-and-network" });

  const lastKeyRef = useRef<string>("");

  const status = data?.me?.climoStatus as "idle" | "building" | "ready" | "error" | undefined;
  const tz = data?.me?.location?.tz as string | undefined;
  const years = data?.me?.climoYears as number[] | undefined;

  const trigger = useCallback(
    async (lat: number, lon: number, opts?: { onComplete?: (ok: boolean) => void; round?: number }) => {
      const r = opts?.round ?? 3;
      const key = `${roundCoord(lat, r)},${roundCoord(lon, r)}`;

      // Avoid re-triggering if we’re already building for same rounded coords
      if (lastKeyRef.current === key && (status === "building" || status === "ready")) {
        opts?.onComplete?.(status === "ready");
        return;
      }
      lastKeyRef.current = key;

      await setUserLocation({ variables: { lat, lon } });

      // Poll while building
      startPolling(2500);

      // Wait until ready/error 
      let done = false;
      for (let i = 0; i < 240 && !done; i++) {
        // ~10 minutes max @ 2.5s
        await new Promise((r) => setTimeout(r, 2500));
        const res = await refetch();
        const s = res?.data?.me?.climoStatus;
        if (s === "ready" || s === "error") {
          stopPolling();
          done = true;
          opts?.onComplete?.(s === "ready");
        }
      }
    },
    [refetch, setUserLocation, startPolling, stopPolling, status]
  );

  return useMemo(
    () => ({
      trigger, // (lat, lon, { onComplete? })
      status,
      tz,
      years,
      loading: setUserLocationState.loading || status === "building",
      error: setUserLocationState.error,
    }),
    [trigger, status, tz, years, setUserLocationState.loading, setUserLocationState.error]
  );
}
