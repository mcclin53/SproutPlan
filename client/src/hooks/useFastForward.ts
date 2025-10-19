import { useState, useEffect, useCallback } from "react";

interface UseFastForwardOptions {
  initialDate?: Date;
  speed?: number; // ms per simulated hour
}

export const useFastForward = ({
  initialDate = new Date(),
  speed = 200,
}: UseFastForwardOptions = {}) => {
  const [simulatedDate, setSimulatedDate] = useState<Date>(initialDate);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  // Toggle fast forward
  const toggle = useCallback(() => {
    setIsFastForwarding(prev => !prev);
  }, []);

  // Advance time
  useEffect(() => {
    if (!isFastForwarding) return;

    const interval = setInterval(() => {
      setSimulatedDate(prev => new Date(prev.getTime() + 1000 * 60 * 60)); // +1 hour per tick
    }, speed);

    return () => clearInterval(interval);
  }, [isFastForwarding, speed]);

  // Optional: reset to a specific date
  const reset = useCallback((date: Date = new Date()) => {
    setSimulatedDate(date);
  }, []);

  return { simulatedDate, isFastForwarding, toggle, reset };
};
