"use client";

import {MIN_LINE_MS} from "@/lib/constants";

type TimingRangeControlProps = {
  totalMs: number;
  startMs: number;
  endMs: number;
  onChange: (patch: {startMs: number; endMs: number}) => void;
};

export function TimingRangeControl({
  totalMs,
  startMs,
  endMs,
  onChange
}: TimingRangeControlProps) {
  const safeTotal = Math.max(totalMs, MIN_LINE_MS + 1);
  const left = (startMs / safeTotal) * 100;
  const width = ((endMs - startMs) / safeTotal) * 100;

  return (
    <div className="space-y-3">
      <div className="relative h-3 rounded-full bg-slate-200/80">
        <div
          className="absolute top-0 h-3 rounded-full bg-coral"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 1)}%`
          }}
        />
      </div>

      <div className="relative h-5">
        <input
          className="absolute inset-0"
          max={Math.max(0, safeTotal - MIN_LINE_MS)}
          min={0}
          onChange={(event) => {
            const nextStart = Number(event.target.value);

            onChange({
              startMs: nextStart,
              endMs: Math.max(nextStart + MIN_LINE_MS, endMs)
            });
          }}
          type="range"
          value={startMs}
        />
        <input
          className="absolute inset-0"
          max={safeTotal}
          min={startMs + MIN_LINE_MS}
          onChange={(event) => {
            onChange({
              startMs,
              endMs: Number(event.target.value)
            });
          }}
          type="range"
          value={endMs}
        />
      </div>
    </div>
  );
}
