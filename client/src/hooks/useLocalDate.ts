import { useEffect, useState } from "react";

export function useLocalDate({
  simulatedDate,
  autoUpdate = false,
  updateInterval = 10 * 60 * 1000, // default = 10 minutes
}: {
  simulatedDate?: Date;
  autoUpdate?: boolean;
  updateInterval?: number;
} = {}) {
  // Initialize with either the simulated date (converted to local) or now
  const [localDate, setLocalDate] = useState(() =>
    simulatedDate ? new Date(simulatedDate) : new Date()
  );

  // Keep local date in sync with simulated date
  useEffect(() => {
    if (simulatedDate) setLocalDate(new Date(simulatedDate));
  }, [simulatedDate]);

  // Auto-update every 10 minutes (for real local clock only)
  useEffect(() => {
    if (!autoUpdate) return;
    const interval = setInterval(() => {
      setLocalDate(new Date());
    }, updateInterval);
    return () => clearInterval(interval);
  }, [autoUpdate, updateInterval]);

  return localDate;
}
