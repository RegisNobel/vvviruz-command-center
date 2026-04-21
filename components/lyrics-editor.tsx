"use client";

import {AlignCenter, GitMerge, ScissorsLineDashed, SquarePlus} from "lucide-react";

import type {LyricLine} from "@/lib/types";
import {formatMsPrecise} from "@/lib/utils";
import {TimingRangeControl} from "@/components/timing-range-control";

type LyricsEditorProps = {
  lines: LyricLine[];
  totalDurationMs: number;
  selectedLineId: string | null;
  onSelect: (lineId: string) => void;
  onLineChange: (lineId: string, patch: Partial<LyricLine>) => void;
  onSplit: (lineId: string) => void;
  onMergeDown: (lineId: string) => void;
  onAddAfter: (lineId: string) => void;
};

export function LyricsEditor({
  lines,
  totalDurationMs,
  selectedLineId,
  onSelect,
  onLineChange,
  onSplit,
  onMergeDown,
  onAddAfter
}: LyricsEditorProps) {
  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="field-label">Review & Edit</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            Fix lyrics and tighten sync
          </h2>
        </div>
        <span className="pill">{lines.length} lines</span>
      </div>

      <div className="mt-5 space-y-4">
        {lines.map((line, index) => {
          const isSelected = selectedLineId === line.id;
          const canMerge = index < lines.length - 1;

          return (
            <article
              className={`rounded-[24px] border p-4 transition ${
                isSelected
                  ? "border-coral/70 bg-coral/5 shadow-soft"
                  : "border-slate-200/70 bg-white/75"
              }`}
              key={line.id}
              onClick={() => onSelect(line.id)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="pill">Line {index + 1}</span>
                  <span className="pill">{formatMsPrecise(line.startMs)}</span>
                  <span className="pill">{formatMsPrecise(line.endMs)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="action-button-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSplit(line.id);
                    }}
                    type="button"
                  >
                    <ScissorsLineDashed size={16} />
                    Split
                  </button>
                  <button
                    className="action-button-secondary"
                    disabled={!canMerge}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMergeDown(line.id);
                    }}
                    type="button"
                  >
                    <GitMerge size={16} />
                    Merge Down
                  </button>
                  <button
                    className="action-button-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddAfter(line.id);
                    }}
                    type="button"
                  >
                    <SquarePlus size={16} />
                    Add Below
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <label className="space-y-2">
                  <span className="field-label">Lyrics</span>
                  <textarea
                    className="field-input min-h-[118px]"
                    onChange={(event) =>
                      onLineChange(line.id, {text: event.target.value})
                    }
                    value={line.text}
                  />
                </label>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="field-label">Start ms</span>
                      <input
                        className="field-input"
                        min={0}
                        onChange={(event) =>
                          onLineChange(line.id, {
                            startMs: Number(event.target.value)
                          })
                        }
                        type="number"
                        value={line.startMs}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="field-label">End ms</span>
                      <input
                        className="field-input"
                        min={line.startMs + 300}
                        onChange={(event) =>
                          onLineChange(line.id, {
                            endMs: Number(event.target.value)
                          })
                        }
                        type="number"
                        value={line.endMs}
                      />
                    </label>
                  </div>

                  <div className="rounded-[20px] border border-slate-200/70 bg-white/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <AlignCenter size={16} />
                      Drag timing handles
                    </div>
                    <TimingRangeControl
                      endMs={line.endMs}
                      onChange={(patch) => onLineChange(line.id, patch)}
                      startMs={line.startMs}
                      totalMs={totalDurationMs}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
