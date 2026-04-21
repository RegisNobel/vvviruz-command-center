"use client";

import {Link2, Sparkles} from "lucide-react";

import type {ReleaseSummary} from "@/lib/types";

type ReleaseContextStepProps = {
  releases: ReleaseSummary[];
  selectedReleaseId: string | null;
  onSelectRelease: (releaseId: string | null) => void;
  onContinue: () => void | Promise<void>;
};

function formatReleaseLabel(release: ReleaseSummary) {
  return `${release.title} • ${release.type}`;
}

export function ReleaseContextStep({
  releases,
  selectedReleaseId,
  onSelectRelease,
  onContinue
}: ReleaseContextStepProps) {
  const selectedRelease =
    releases.find((release) => release.id === selectedReleaseId) ?? null;
  const isWaitingForSelectedRelease = Boolean(selectedReleaseId) && !selectedRelease;

  return (
    <section className="panel p-6">
      <div className="panel-header">
        <div>
          <p className="field-label">Project Context</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">
            Attach this project to a release?
          </h2>
        </div>
        <span className="pill">
          <Link2 size={12} />
          Optional
        </span>
      </div>

      <div className="mt-5 space-y-4 rounded-[24px] border border-slate-200/70 bg-white/75 p-5">
        <label className="space-y-2">
          <span className="field-label">Release link</span>
          <select
            className="field-input"
            onChange={(event) =>
              onSelectRelease(
                event.target.value === "standalone" ? null : event.target.value
              )
            }
            value={selectedReleaseId ?? "standalone"}
          >
            <option value="standalone">No Release / Standalone</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {formatReleaseLabel(release)}
              </option>
            ))}
          </select>
        </label>

        {selectedRelease ? (
          <div className="rounded-[22px] border border-slate-200/70 bg-white/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill">{selectedRelease.type}</span>
              <span className="pill">{selectedRelease.status}</span>
              <span className="pill">{selectedRelease.progress_percentage}%</span>
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900">
              {selectedRelease.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              This lyric project will automatically show up on that release inside
              Generated Clips.
            </p>
          </div>
        ) : isWaitingForSelectedRelease ? (
          <div className="rounded-[22px] border border-slate-200/70 bg-white/80 p-4">
            <p className="text-base font-semibold text-slate-900">
              Release preselected
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Loading the linked release details for this clip context...
            </p>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-slate-300/70 bg-white/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-ink p-3 text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Standalone project
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  This session will stay independent and won&apos;t appear on any release.
                </p>
              </div>
            </div>
          </div>
        )}

        {releases.length === 0 && !selectedReleaseId ? (
          <p className="text-sm text-slate-600">
            No releases exist yet, so only standalone mode is available right now.
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex justify-end">
        <button className="action-button-primary" onClick={() => void onContinue()} type="button">
          Continue to Audio
        </button>
      </div>
    </section>
  );
}
