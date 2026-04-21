"use client";

import {useRef, useState} from "react";
import {Music4, UploadCloud, Wand2} from "lucide-react";

import type {AudioAsset} from "@/lib/types";
import {cn, formatMs} from "@/lib/utils";

type AudioDropzoneProps = {
  audio: AudioAsset | null;
  isUploading: boolean;
  requiresTrim: boolean;
  isTranscribing: boolean;
  message: string | null;
  onFileSelect: (file: File) => void | Promise<void>;
};

export function AudioDropzone({
  audio,
  isUploading,
  requiresTrim,
  isTranscribing,
  message,
  onFileSelect
}: AudioDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="field-label">Audio Source</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Upload a short clip</h2>
        </div>
        <span className="pill">30 sec max</span>
      </div>

      <div
        className={cn(
          "subtle-grid mt-5 rounded-[24px] border border-dashed p-6 transition",
          isDragging
            ? "border-coral bg-coral/5"
            : "border-slate-300/70 bg-white/60"
        )}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);

          const file = event.dataTransfer.files.item(0);

          if (file) {
            void onFileSelect(file);
          }
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-ink p-3 text-white">
              <Music4 size={22} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Drop audio here or choose a file
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Supports MP3, WAV, and M4A. Longer clips are trimmed before
                transcription.
              </p>
            </div>
          </div>

          <button
            className="action-button-primary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <UploadCloud size={16} />
            {isUploading ? "Uploading..." : "Choose Audio"}
          </button>
        </div>

        <input
          ref={inputRef}
          accept=".mp3,.wav,.m4a,audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.item(0);

            if (file) {
              void onFileSelect(file);
            }

            event.currentTarget.value = "";
          }}
          type="file"
        />
      </div>

      {audio ? (
        <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{audio.fileName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {formatMs(audio.durationMs)}
                {audio.trimmed ? " trimmed clip" : " original clip"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="pill">
                {requiresTrim ? "Trim required" : "Ready for editing"}
              </span>
              {audio.trimmed ? <span className="pill">Trimmed</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-coral/15 bg-coral/5 px-4 py-3 text-sm text-slate-700">
          <Wand2 className="mt-0.5 shrink-0 text-coral" size={16} />
          <p>{message}</p>
        </div>
      ) : null}

      {isTranscribing ? (
        <p className="mt-4 text-sm font-medium text-slate-600">
          Running local Whisper transcription...
        </p>
      ) : null}
    </section>
  );
}
