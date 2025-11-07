import React from "react";
import { useTimeControl } from "../hooks/useTimeControl";
import { useLocalDate } from "../hooks/useLocalDate";
import { Calendar } from "./Calendar";

interface TimeControllerProps {
  initialDate?: Date;
  speed?: number; // ms per simulated step interval
  onDateChange?: (date: Date) => void;
  onOpenCalendar?: () => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  initialDate = new Date(),
  speed = 200,
  onDateChange,
  onOpenCalendar,
}) => {
  const {
    simulatedDate,
    isRunning,
    mode,
    toggle,
    pause,
    runRew1h,
    runRew2h,
    runRew1d,
    runFwd1h,
    runFwd2h,
    runFwd1d,
    runPlay,
    reset,
  } = useTimeControl({ initialDate, speed });

  const [open, setOpen] = React.useState(false);

  // notify parent on date changes
  const onChangeRef = React.useRef<typeof onDateChange>();
  React.useEffect(() => {
    onChangeRef.current = onDateChange;
  }, [onDateChange]);

  React.useEffect(() => {
    onChangeRef.current?.(simulatedDate);
  }, [simulatedDate]);

  const localSimulatedDate = useLocalDate({ simulatedDate });

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <div className="button" >
        {/* RESET) */}
        <button className="button" onClick={() => reset(initialDate)} title="Reset to starting date" style={{ fontSize: "1.25rem", lineHeight: 1 }} >
          ↺
        </button>
        {/* REWIND */}
        <button className="button" onClick={runRew1d} title="Auto back 1 day" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em" }}>
        ◀◀◀◀
        </button>
        <button className="button" onClick={runRew2h} title="Auto back 2 hours" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em" }}>
        ◀◀◀
        </button>
        <button className="button" onClick={runRew1h} title="Auto back 1 hour" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em" }}>
        ◀◀
        </button>

        {/* Play / Pause */}
        {isRunning ? (
          <button className="button" onClick={pause} title={`Pause (${mode})`} style={{ fontSize: "1 rem", lineHeight: 1 }}>
            ⏸
          </button>
        ) : (
          <button className="button" onClick={runPlay} title="Play (+15m ticks)" style={{ fontSize: "1 rem", lineHeight: 1 }}>
            ▶
          </button>
        )}

        {/* FORWARD */}
        <button className="button" onClick={runFwd1h} title="Auto forward 1 hour" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em" }}>
          ▶▶
        </button>
        <button className="button" onClick={runFwd2h} title="Auto forward 2 hours" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em",  }}>
          ▶▶▶
        </button>
        <button className="button" onClick={runFwd1d} title="Auto forward 1 day" style={{ fontSize: "1 rem", lineHeight: 1, letterSpacing: "-0.2em" }}>
          ▶▶▶▶
        </button>

        {/* Calendar */}
        <button className="button" onClick={() => { pause(); setOpen(true); }} title="Open calendar" style={{ fontSize: "1.25rem", lineHeight: 1 }}>
          ▦
        </button>

        <span style={{ marginLeft: "10px" }}>
          Simulated time: {localSimulatedDate.toLocaleString()}
        </span>
      </div>
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            zIndex: 20,
          }}
          >
      <Calendar
            value={simulatedDate}
            onChange={(picked) => {
              if (picked) {
                reset(picked);
              }
              setOpen(false);
            }}
            minDate={new Date(2020, 0, 1)}
            maxDate={new Date(2031, 11, 31)}
            showFooter
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
