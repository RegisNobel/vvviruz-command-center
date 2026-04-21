"use client";

import {Scissors, TimerReset} from "lucide-react";

import {MAX_AUDIO_MS} from "@/lib/constants";
import type {AudioAsset} from "@/lib/types";
import {formatMs} from "@/lib/utils";
import {WaveformTrimmer} from "@/components/waveform-trimmer";

type TrimEditorProps = {
  audio: AudioAsset | null;
  requiresTrim: boolean;
  startMs: number;
  endMs: number;
  isTrimming: boolean;
  onRangeChange: (range: {startMs: number; endMs: number}) => void;
  onTrim: () => void | Promise<void>;
};

export function TrimEditor({
  audio,
  requiresTrim,
  startMs,
  endMs,
  isTrimming,
  onRangeChange,
  onTrim
}: TrimEditorProps) {
  if (!audio) {
    return null;
  }

  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="field-label">Trim</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            {requiresTrim ? "Pick the 30-second section" : "Optional trim"}
          </h2>
        </div>
        <span className="pill">{formatMs(audio.durationMs)} clip</span>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        {requiresTrim
          ? "This audio is longer than 30 seconds, so trimming is required before transcription and export."
          : "You can fine-tune the in and out points before re-transcribing or exporting."}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="field-label">Start (ms)</span>
          <input
            className="field-input"
            max={Math.max(0, audio.durationMs - 300)}
            min={0}
            onChange={(event) => {
              const nextStart = Number(event.target.value);
              const maxEnd = Math.min(audio.durationMs, nextStart + MAX_AUDIO_MS);

              onRangeChange({
                startMs: nextStart,
                endMs: Math.max(nextStart + 300, Math.min(endMs, maxEnd))
              });
            }}
            type="number"
            value={startMs}
          />
        </label>

        <label className="space-y-2">
          <span className="field-label">End (ms)</span>
          <input
            className="field-input"
            max={audio.durationMs}
            min={startMs + 300}
            onChange={(event) => {
              const nextEnd = Number(event.target.value);

              onRangeChange({
                startMs,
                endMs: Math.min(
                  Math.max(startMs + 300, nextEnd),
                  startMs + MAX_AUDIO_MS
                )
              });
            }}
            type="number"
            value={endMs}
          />
        </label>
      </div>

      <div className="mt-4">
        <WaveformTrimmer
          audioUrl={audio.url}
          durationMs={audio.durationMs}
          endMs={endMs}
          onChange={onRangeChange}
          startMs={startMs}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="pill">
            <TimerReset size={12} />
            {formatMs(endMs - startMs)} selected
          </span>
          {endMs - startMs > MAX_AUDIO_MS ? (
            <span className="pill">Needs to be &lt;= 00:30</span>
          ) : null}
        </div>

        <button
          className="action-button-primary"
          disabled={isTrimming || endMs - startMs > MAX_AUDIO_MS}
          onClick={() => void onTrim()}
          type="button"
        >
          <Scissors size={16} />
          {isTrimming ? "Trimming..." : "Trim and Continue"}
        </button>
      </div>
    </section>
  );
}
