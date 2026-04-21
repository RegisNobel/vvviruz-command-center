"use client";

import {Download, FileText, LoaderCircle} from "lucide-react";

import type {ResolutionPreset} from "@/lib/types";

type ExportPanelProps = {
  resolution: ResolutionPreset;
  exportProgress: number;
  exportStage: string | null;
  isExporting: boolean;
  downloadUrl: string | null;
  onResolutionChange: (resolution: ResolutionPreset) => void;
  onExportSrt: () => void;
  onExportVideo: () => void | Promise<void>;
};

export function ExportPanel({
  resolution,
  exportProgress,
  exportStage,
  isExporting,
  downloadUrl,
  onResolutionChange,
  onExportSrt,
  onExportVideo
}: ExportPanelProps) {
  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="field-label">Export</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            Render and download the final MP4
          </h2>
        </div>
        <span className="pill">H.264 + AAC</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="space-y-2">
          <span className="field-label">Resolution</span>
          <select
            className="field-input"
            onChange={(event) =>
              onResolutionChange(event.target.value as ResolutionPreset)
            }
            value={resolution}
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </label>

        <button className="action-button-secondary" onClick={onExportSrt} type="button">
          <FileText size={16} />
          Export SRT
        </button>

        <button
          className="action-button-primary"
          disabled={isExporting}
          onClick={() => void onExportVideo()}
          type="button"
        >
          {isExporting ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Download size={16} />
          )}
          {isExporting ? "Rendering..." : "Export Video"}
        </button>
      </div>

      <div className="mt-5 rounded-[22px] border border-slate-200/70 bg-white/75 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Render progress
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {exportStage ?? "Waiting to start export."}
            </p>
          </div>
          <p className="text-lg font-semibold text-ink">
            {Math.round(exportProgress * 100)}%
          </p>
        </div>

        <div className="mt-4 h-3 rounded-full bg-slate-200/80">
          <div
            className="h-3 rounded-full bg-coral transition-all"
            style={{width: `${Math.max(6, Math.round(exportProgress * 100))}%`}}
          />
        </div>
      </div>

      {downloadUrl ? (
        <a
          className="action-button-primary mt-4 w-full"
          href={downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          <Download size={16} />
          Download MP4
        </a>
      ) : null}
    </section>
  );
}
