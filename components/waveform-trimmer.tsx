"use client";

import {useEffect, useRef, useState} from "react";
import {Pause, Play, RotateCcw, Scissors} from "lucide-react";

import {MAX_AUDIO_MS} from "@/lib/constants";
import {formatMs} from "@/lib/utils";

type WaveformTrimmerProps = {
  audioUrl: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  onChange: (range: {startMs: number; endMs: number}) => void;
};

export function WaveformTrimmer({
  audioUrl,
  startMs,
  endMs,
  durationMs,
  onChange
}: WaveformTrimmerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<any>(null);
  const regionRef = useRef<any>(null);
  const syncRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      if (!containerRef.current) {
        return;
      }

      const WaveSurfer = (await import("wavesurfer.js")).default;
      const RegionsPlugin = (
        await import("wavesurfer.js/dist/plugins/regions.esm.js")
      ).default;

      if (disposed || !containerRef.current) {
        return;
      }

      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "rgba(118, 124, 133, 0.28)",
        progressColor: "#c9a347",
        cursorColor: "#d8b864",
        barWidth: 3,
        barGap: 2,
        barRadius: 999,
        height: 120,
        dragToSeek: true
      });

      const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
      wavesurferRef.current = wavesurfer;

      wavesurfer.on("ready", () => {
        setIsReady(true);
        regionRef.current = regions.addRegion({
          start: startMs / 1000,
          end: endMs / 1000,
          drag: true,
          resize: true,
          minLength: 0.3,
          maxLength: MAX_AUDIO_MS / 1000,
          color: "rgba(201, 163, 71, 0.22)"
        });
      });

      regions.on("region-updated", (region: any) => {
        if (syncRef.current) {
          return;
        }

        onChangeRef.current({
          startMs: Math.round(region.start * 1000),
          endMs: Math.round(region.end * 1000)
        });
      });

      wavesurfer.on("finish", () => setIsPlaying(false));
      wavesurfer.on("pause", () => setIsPlaying(false));
      wavesurfer.on("play", () => setIsPlaying(true));

      wavesurfer.load(audioUrl);
    }

    void boot();

    return () => {
      disposed = true;
      setIsReady(false);
      regionRef.current = null;
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, endMs, startMs]);

  useEffect(() => {
    const region = regionRef.current;

    if (!region) {
      return;
    }

    const nextStart = startMs / 1000;
    const nextEnd = endMs / 1000;

    if (
      Math.abs(region.start - nextStart) < 0.02 &&
      Math.abs(region.end - nextEnd) < 0.02
    ) {
      return;
    }

    syncRef.current = true;
    region.setOptions({
      start: nextStart,
      end: nextEnd
    });
    syncRef.current = false;
  }, [endMs, startMs]);

  return (
    <div className="rounded-[24px] border border-[#2f343b] bg-[#16191d] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="pill">Start {formatMs(startMs)}</span>
          <span className="pill">End {formatMs(endMs)}</span>
          <span className="pill">Window {formatMs(endMs - startMs)}</span>
        </div>

        <div className="flex gap-2">
          <button
            className="action-button-secondary"
            onClick={() => wavesurferRef.current?.playPause()}
            type="button"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            className="action-button-secondary"
            onClick={() => {
              onChangeRef.current({
                startMs: 0,
                endMs: Math.min(durationMs, MAX_AUDIO_MS)
              });
            }}
            type="button"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div
        className="rounded-[20px] border border-[#2f343b] bg-[#111419] px-4 py-5"
        ref={containerRef}
      />

      {!isReady ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Scissors size={14} />
          Preparing waveform…
        </div>
      ) : null}
    </div>
  );
}
