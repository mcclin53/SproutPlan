import React from "react";
import { useFastForward } from "../hooks/useFastForward";
import { useLocalDate } from "../hooks/useLocalDate";

interface TimeControllerProps {
  initialDate?: Date;
  speed?: number; // ms per simulated hour
  onDateChange?: (date: Date) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  initialDate = new Date(),
  speed = 200,
  onDateChange,
}) => {
  const { simulatedDate, isFastForwarding, toggle } = useFastForward({
    initialDate,
    speed,
  });

  // Call onDateChange whenever the simulated date updates
  const onChangeRef = React.useRef<typeof onDateChange>();
  React.useEffect(() => {
    onChangeRef.current = onDateChange;
  }, [onDateChange]);

  React.useEffect(() => {
    onChangeRef.current?.(simulatedDate);
    }, [simulatedDate]);

  const localSimulatedDate = useLocalDate({ simulatedDate });

  return (
    <div style={{ marginBottom: "10px" }}>
      <button className="button" onClick={toggle}>
        {isFastForwarding ? "Pause" : "Fast Forward"}
      </button>
      <span style={{ marginLeft: "10px" }}>
        Simulated time: {localSimulatedDate.toLocaleString()}
      </span>
    </div>
  );
};
