import { useState, useEffect, useCallback } from "react";

interface UseTimeControlOptions {
  initialDate?: Date;
  speed?: number; // ms per simulated hour
}

type RunMode =
  | "idle"          // paused
  | "play15m"       // +15 minutes per tick
  | "fwd1h"         // +1 hour per tick
  | "fwd2h"         // +2 hours per tick
  | "fwd1d"         // +1 day per tick
  | "rew1h"         // -1 hour per tick
  | "rew2h"         // -2 hours per tick
  | "rew1d";        // -1 day per tick

export const useTimeControl = ({
  initialDate = new Date(),
  speed = 200,
}: UseTimeControlOptions = {}) => {
  const [simulatedDate, setSimulatedDate] = useState<Date>(initialDate);
  const [mode, setMode] = useState<RunMode>("idle");

  const stepMsFor = useCallback((m: RunMode): number => {
    switch (m) {
      case "play15m":
        return 15 * 60 * 1000;           // +15 minutes
      case "fwd1h":
        return 1 * 60 * 60 * 1000;       // +1 hour
      case "fwd2h":
        return 2 * 60 * 60 * 1000;       // +2 hours
      case "fwd1d":
        return 24 * 60 * 60 * 1000;      // +1 day
      case "rew1h":
        return -1 * 60 * 60 * 1000;      // -1 hour
      case "rew2h":
        return -2 * 60 * 60 * 1000;      // -2 hours
      case "rew1d":
        return -24 * 60 * 60 * 1000;     // -1 day
      case "idle":
      default:
        return 0;
    }
  }, []);

  useEffect(() => {
    if (mode === "idle") return;

    const step = stepMsFor(mode);
    const id = setInterval(() => {
      setSimulatedDate((prev) => new Date(prev.getTime() + step));
    }, speed);

    return () => clearInterval(id);
  }, [mode, speed, stepMsFor]);

  // Toggle fast forward
  const toggle = useCallback(() => {
    setMode((prev) => (prev === "idle" ? "play15m" : "idle"));
  }, []);

  const runPlay = useCallback(() => setMode("play15m"), []);
  const runFwd1h = useCallback(() => setMode("fwd1h"), []);
  const runFwd2h = useCallback(() => setMode("fwd2h"), []);
  const runFwd1d = useCallback(() => setMode("fwd1d"), []);
  const runRew1h = useCallback(() => setMode("rew1h"), []);
  const runRew2h = useCallback(() => setMode("rew2h"), []);
  const runRew1d = useCallback(() => setMode("rew1d"), []);

  const pause = useCallback(() => setMode("idle"), []);
  const stepHour = useCallback((direction: 1 | -1) => {
    setSimulatedDate(
      (prev) => new Date(prev.getTime() + direction * 60 * 60 * 1000)
    );
  }, []);

  const stepTwoHours = useCallback((direction: 1 | -1) => {
    setSimulatedDate(
      (prev) => new Date(prev.getTime() + direction * 2 * 60 * 60 * 1000)
    );
  }, []);

  const stepDay = useCallback((direction: 1 | -1) => {
    setSimulatedDate(
      (prev) => new Date(prev.getTime() + direction * 24 * 60 * 60 * 1000)
    );
  }, []);

  const reset = useCallback((date: Date = new Date()) => {
    setSimulatedDate(date);
  }, []);

 return {
    simulatedDate,
    isRunning: mode !== "idle",
    mode,
    toggle,
    pause,
    runPlay,
    runFwd1h,
    runFwd2h,
    runFwd1d,
    runRew1h,
    runRew2h,
    runRew1d,
    reset,
    stepHour,
    stepTwoHours,
    stepDay,
  };
};
