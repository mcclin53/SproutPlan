import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";

type CalendarProps = {
  value?: Date | null;
  onChange?: (date: Date) => void;
  initialMonth?: Date;
  onClose?: () => void;
  minDate?: Date;
  maxDate?: Date;
  isDateDisabled?: (d: Date) => boolean;
  showFooter?: boolean;
  className?: string;
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function sameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function sameMonth(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
function clamp(d: Date, min?: Date, max?: Date) {
  const t = startOfDay(d).getTime();
  if (min && t < startOfDay(min).getTime()) return startOfDay(min);
  if (max && t > startOfDay(max).getTime()) return startOfDay(max);
  return startOfDay(d);
}
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function addMonths(d: Date, months: number) { const x = new Date(d); x.setMonth(x.getMonth() + months); return x; }
function addYears(d: Date, years: number) { const x = new Date(d); x.setFullYear(x.getFullYear() + years); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date, weekStartsOn = 0) {
  const x = startOfDay(d);
  const diff = (x.getDay() - weekStartsOn + 7) % 7;
  return addDays(x, -diff);
}

const btnBase = {
  border: "1px solid #e5e7eb",
  background: "white",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
} as const;

export const Calendar: React.FC<CalendarProps> = ({
  value = null,
  onChange,
  initialMonth,
  onClose,
  minDate,
  maxDate,
  isDateDisabled,
  showFooter = true,
  className,
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const initial = useMemo(
    () => startOfMonth(initialMonth ?? value ?? today),
    [initialMonth, value, today]
  );

  const [viewMonth, setViewMonth] = useState<Date>(initial);
  const [focusDate, setFocusDate] = useState<Date>(value ?? today);

  const navMode = useRef<"kbd" | "mouse" | "button" | null>(null);

  // Build grid: 6 weeks × 7 days = 42 cells
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), 0);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [viewMonth]);

  const isDisabled = useCallback(
    (d: Date) => {
      const day = startOfDay(d);
      if (minDate && day < startOfDay(minDate)) return true;
      if (maxDate && day > startOfDay(maxDate)) return true;
      if (isDateDisabled?.(day)) return true;
      return false;
    },
    [minDate, maxDate, isDateDisabled]
  );

  useEffect(() => {
    if (navMode.current === "kbd" && !sameMonth(focusDate, viewMonth)) {
      setViewMonth(startOfMonth(focusDate));
    }
    // reset nav mode after handling
    if (navMode.current !== null) navMode.current = null;
  }, [focusDate, viewMonth]);

  const weeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToMonth = useCallback((base: Date) => {
    const m = startOfMonth(base);
    navMode.current = "button";
    setViewMonth(m);
    setFocusDate((prev) => {
      const desired = new Date(m.getFullYear(), m.getMonth(), 1);
      return clamp(desired, minDate, maxDate);
    });
  }, [minDate, maxDate]);

  const onKeyDown: React.KeyboardEventHandler = (e) => {
    let next = focusDate;
    navMode.current = "kbd";

    if (e.key === "ArrowRight") next = addDays(focusDate, 1);
    else if (e.key === "ArrowLeft") next = addDays(focusDate, -1);
    else if (e.key === "ArrowDown") next = addDays(focusDate, 7);
    else if (e.key === "ArrowUp") next = addDays(focusDate, -7);
    else if (e.key === "PageDown") next = e.shiftKey ? addYears(focusDate, 1) : addMonths(focusDate, 1);
    else if (e.key === "PageUp") next = e.shiftKey ? addYears(focusDate, -1) : addMonths(focusDate, -1);
    else if (e.key === "Home") next = startOfWeek(focusDate, 0);
    else if (e.key === "End") next = addDays(startOfWeek(focusDate, 0), 6);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isDisabled(focusDate)) onChange?.(startOfDay(focusDate));
      return;
    } else if (e.key === "Escape") {
      onClose?.();
      return;
    } else {
      navMode.current = null;
      return;
    }

    e.preventDefault();
    setFocusDate(clamp(next, minDate, maxDate));
  };

  return (
    <div
      className={className}
      style={{
        width: 320,
        padding: 12,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          style={btnBase}
          title="Previous year"
          onClick={() => goToMonth(addYears(viewMonth, -1))}
        >
          {"≪"}
        </button>
        <button
          type="button"
          style={btnBase}
          title="Previous month"
          onClick={() => goToMonth(addMonths(viewMonth, -1))}
        >
          {"<"}
        </button>

        <div style={{ flex: 1, textAlign: "center", fontWeight: 600 }}>
          {viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>

        <button
          type="button"
          style={btnBase}
          title="Next month"
          onClick={() => goToMonth(addMonths(viewMonth, 1))}
        >
          {">"}
        </button>
        <button
          type="button"
          style={btnBase}
          title="Next year"
          onClick={() => goToMonth(addYears(viewMonth, 1))}
        >
          {"≫"}
        </button>
      </div>

      {/* Weekdays */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
          color: "#6b7280",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        {weeks.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Grid */}
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Calendar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          outline: "none",
        }}
      >
        {grid.map((d) => {
          const inMonth = sameMonth(d, viewMonth);
          const selected = value ? sameDay(d, value) : false;
          const focused = sameDay(d, focusDate);
          const todayFlag = sameDay(d, today);
          const disabled = isDisabled(d);

          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange?.(startOfDay(d))}
              onMouseEnter={() => {
                navMode.current = "mouse";
                if (inMonth) setFocusDate(d);
              }}
              style={{
                ...btnBase,
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 14,
                color: disabled ? "#9ca3af" : inMonth ? "#111827" : "#9ca3af",
                borderColor: selected ? "#111827" : "#e5e7eb",
                background: selected ? "#f3f4f6" : "white",
                outline: focused ? "2px solid #111827" : "none",
              }}
              title={d.toDateString() + (disabled ? " (disabled)" : "")}
            >
              <div style={{ fontWeight: todayFlag ? 700 : 500 }}>
                {d.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {showFooter && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            style={{ ...btnBase, flex: 1 }}
            onClick={() => onChange?.(today)}
            title="Jump to today"
          >
            Today
          </button>
          <button
            type="button"
            style={{ ...btnBase, flex: 1 }}
            onClick={() => onChange?.(null as unknown as Date)}
            title="Clear selection"
          >
            Clear
          </button>
          {onClose && (
            <button
              type="button"
              style={{ ...btnBase }}
              onClick={onClose}
              title="Close"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
};
