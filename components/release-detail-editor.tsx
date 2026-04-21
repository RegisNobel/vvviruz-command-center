"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SVGProps
} from "react";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  ArrowLeft,
  Captions,
  Film,
  FolderOpen,
  ImagePlus,
  Link2Off,
  Plus,
  Save,
  Sparkles,
  Trash2
} from "lucide-react";

import {AUTOSAVE_INTERVAL_MS} from "@/lib/constants";
import {
  calculateReleaseProgress,
  createReleaseTask,
  getReleaseProgressTone
} from "@/lib/releases";
import {formatCopyType, getCopyHeading} from "@/lib/copy";
import type {ReleaseChecklistKey} from "@/lib/releases";
import type {
  CopySummary,
  ProjectSummary,
  ReleaseCoverUploadResponse,
  ReleaseRecord,
  ReleaseType
} from "@/lib/types";
import {formatMs} from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

const stageFields: Array<{key: ReleaseChecklistKey; label: string}> = [
  {key: "concept_complete", label: "Concept complete"},
  {key: "lyrics_finished", label: "Lyrics finished"},
  {key: "beat_made", label: "Beat made"},
  {key: "recorded", label: "Recorded"},
  {key: "mix_mastered", label: "Mix/Mastered"},
  {key: "published", label: "Published"}
];

type SnapshotStageDefinition = {
  key: ReleaseChecklistKey;
  label: string;
  getRequirements: (
    release: ReleaseRecord
  ) => Array<{blocker: string; nextAction: string}>;
};

const snapshotStageDefinitions: SnapshotStageDefinition[] = [
  {
    key: "concept_complete",
    label: "Concept",
    getRequirements: (release) =>
      release.concept_details.trim()
        ? []
        : [
            {
              blocker: "Missing concept details",
              nextAction: "Add concept details"
            }
          ]
  },
  {
    key: "lyrics_finished",
    label: "Lyrics",
    getRequirements: (release) =>
      release.lyrics.trim()
        ? []
        : [
            {
              blocker: "Missing lyrics",
              nextAction: "Add lyrics"
            }
          ]
  },
  {
    key: "beat_made",
    label: "Beat",
    getRequirements: () => []
  },
  {
    key: "recorded",
    label: "Recorded",
    getRequirements: () => []
  },
  {
    key: "mix_mastered",
    label: "Mix/Mastered",
    getRequirements: () => []
  },
  {
    key: "published",
    label: "Published",
    getRequirements: (release) => {
      const requirements: Array<{blocker: string; nextAction: string}> = [];

      if (!release.cover_art) {
        requirements.push({
          blocker: "Missing cover art",
          nextAction: "Upload cover art"
        });
      }

      if (release.collaborator && !release.collaborator_name.trim()) {
        requirements.push({
          blocker: "Missing collaborator name",
          nextAction: "Add collaborator name"
        });
      }

      if (!release.release_date.trim()) {
        requirements.push({
          blocker: "Missing release date",
          nextAction: "Add release date"
        });
      }

      return requirements;
    }
  }
];

function getCurrentSnapshotStageDefinition(release: ReleaseRecord) {
  return (
    snapshotStageDefinitions.find((stage) => !release[stage.key]) ??
    snapshotStageDefinitions[snapshotStageDefinitions.length - 1]
  );
}

function getSnapshotValidationWarnings(release: ReleaseRecord) {
  return snapshotStageDefinitions.flatMap((stage) => {
    if (!release[stage.key]) {
      return [];
    }

    return stage.getRequirements(release).map(
      (requirement) => `${stage.label} validation warning: ${requirement.blocker}`
    );
  });
}

function serializeRelease(release: ReleaseRecord) {
  return JSON.stringify(release);
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatReleaseType(value: ReleaseType) {
  return value === "mainstream" ? "Mainstream" : "Nerdcore";
}

function normalizeExternalUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    return new URL(trimmedValue).toString();
  } catch {
    try {
      return new URL(`https://${trimmedValue}`).toString();
    } catch {
      return null;
    }
  }
}

function getSnapshotStage(release: ReleaseRecord) {
  return getCurrentSnapshotStageDefinition(release).label;
}

function getSnapshotNextAction(release: ReleaseRecord) {
  const currentStage = getCurrentSnapshotStageDefinition(release);
  const requirements = currentStage.getRequirements(release);

  if (requirements.length > 0) {
    return requirements[0].nextAction;
  }

  if (!release[currentStage.key]) {
    return `Mark ${currentStage.label} complete`;
  }

  return "No action needed";
}

function getSnapshotBlockers(release: ReleaseRecord) {
  const currentStage = getCurrentSnapshotStageDefinition(release);
  const currentStageRequirements = currentStage.getRequirements(release);
  const blockers = [...getSnapshotValidationWarnings(release)];

  if (currentStageRequirements.length > 0) {
    if (!release[currentStage.key]) {
      blockers.push(...currentStageRequirements.map((requirement) => requirement.blocker));
    }

    return blockers;
  }

  if (!release[currentStage.key]) {
    blockers.push(`${currentStage.label} approval pending`);
  }

  return blockers;
}

const pageShellClass =
  "min-h-[calc(100vh-81px)] bg-[#0f1114] text-[#e7e2d8]";
const pagePanelClass =
  "rounded-[28px] border border-[#2a2d32] bg-[#17191d]";
const pageLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b8088]";
const pageInputClass =
  "w-full rounded-2xl border border-[#343840] bg-[#0f1216] px-4 py-3 text-sm text-[#ece6d8] outline-none transition placeholder:text-[#6d7279] [color-scheme:dark] focus:border-[#c9a347] focus:ring-2 focus:ring-[#c9a347]/25";
const pagePrimaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#c9a347] px-4 py-2.5 text-sm font-semibold text-[#121418] transition hover:bg-[#d5b15b]";
const pageSecondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#3a3f46] bg-[#15181c] px-4 py-2.5 text-sm font-semibold text-[#ece6d8] transition hover:border-[#50555d] hover:bg-[#1b1f24]";
const pageDangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#7b3e3e] bg-[#341919] px-4 py-2.5 text-sm font-semibold text-[#f0d7d2] transition hover:border-[#9a5656] hover:bg-[#452020]";
const pageTertiaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-[#9ba0a8] transition hover:bg-[#181b20] hover:text-[#ede8dc]";
const pagePillClass =
  "inline-flex items-center gap-2 rounded-full border border-[#31353b] bg-[#121417] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8c9199]";
const pageAccentPillClass =
  "inline-flex items-center gap-2 rounded-full border border-[#5b4920] bg-[#1a1710] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#d6b45d]";
const pageCheckboxClass =
  "h-4 w-4 rounded border border-[#4a4f57] bg-[#0e1115] accent-[#c9a347] focus:ring-2 focus:ring-[#c9a347]/35 focus:ring-offset-0";

function SpotifyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path
        d="M7.4 9.15c3.45-1.18 7.12-1.02 10.08.52"
        stroke="#09120b"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M8.28 12.08c2.7-.88 5.56-.72 7.83.43"
        stroke="#09120b"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M9.15 14.88c1.95-.57 4-.42 5.6.42"
        stroke="#09120b"
        strokeLinecap="round"
        strokeWidth="1.45"
      />
    </svg>
  );
}

function YouTubeLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <rect fill="currentColor" height="14" rx="4.5" width="20" x="2" y="5" />
      <path d="m10 9 5 3-5 3V9Z" fill="#fff7f5" />
    </svg>
  );
}

function AppleMusicLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <path
        d="M15.6 5.2v9.7a2.8 2.8 0 1 1-1.55-2.5V8.2l-4.92 1.13v7.57a2.8 2.8 0 1 1-1.55-2.5V7.88c0-.71.49-1.33 1.18-1.48l5.55-1.28a1.43 1.43 0 0 1 1.29.29c.32.26.5.64.5 1.05Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ReleaseDetailEditor({
  initialLinkedCopies,
  initialRelease,
  initialLinkedProjects
}: {
  initialLinkedCopies: CopySummary[];
  initialRelease: ReleaseRecord;
  initialLinkedProjects: ProjectSummary[];
}) {
  const router = useRouter();
  const [release, setRelease] = useState(initialRelease);
  const [linkedCopies, setLinkedCopies] = useState(initialLinkedCopies);
  const [linkedProjects, setLinkedProjects] = useState(initialLinkedProjects);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [taskText, setTaskText] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const lastSavedSnapshotRef = useRef<string>(serializeRelease(initialRelease));
  const autosaveTimerRef = useRef<number | null>(null);
  const latestDraftSnapshotRef = useRef<string>(serializeRelease(initialRelease));

  const progress = useMemo(() => calculateReleaseProgress(release), [release]);
  const snapshotStage = useMemo(() => getSnapshotStage(release), [release]);
  const currentStage = snapshotStage;
  const snapshotNextAction = useMemo(() => getSnapshotNextAction(release), [release]);
  const snapshotBlockers = useMemo(() => getSnapshotBlockers(release), [release]);
  const saveStatusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save error"
        : hasPendingChanges
          ? "Unsaved changes"
          : "Saved";
  const isErrorMessage = useMemo(() => {
    if (!message) {
      return false;
    }

    const normalizedMessage = message.toLowerCase();

    return (
      saveState === "error" ||
      normalizedMessage.includes("failed") ||
      normalizedMessage.includes("error")
    );
  }, [message, saveState]);
  const streamingMetadataButtons = useMemo(
    () => [
      {
        label: "Spotify",
        href: normalizeExternalUrl(release.streaming_links.spotify),
        icon: SpotifyLogo,
        activeClassName:
          "border-[#1f8f55] bg-[#1db954] text-[#07140c] hover:bg-[#20c25a]",
        inactiveClassName:
          "border-[#31453a] bg-[#101614] text-[#72877c] hover:border-[#3a5246] hover:bg-[#141c18]"
      },
      {
        label: "Apple Music",
        href: normalizeExternalUrl(release.streaming_links.apple_music),
        icon: AppleMusicLogo,
        activeClassName:
          "border-[#b13a6c] bg-[#ff2d72] text-[#1b0710] hover:bg-[#ff4a86]",
        inactiveClassName:
          "border-[#503241] bg-[#181116] text-[#917184] hover:border-[#654253] hover:bg-[#1d141a]"
      },
      {
        label: "YouTube",
        href: normalizeExternalUrl(release.streaming_links.youtube),
        icon: YouTubeLogo,
        activeClassName:
          "border-[#a63333] bg-[#ff3b30] text-[#190606] hover:bg-[#ff544a]",
        inactiveClassName:
          "border-[#513131] bg-[#171112] text-[#95706f] hover:border-[#654040] hover:bg-[#1c1415]"
      }
    ],
    [
      release.streaming_links.apple_music,
      release.streaming_links.spotify,
      release.streaming_links.youtube
    ]
  );

  useEffect(() => {
    latestDraftSnapshotRef.current = serializeRelease(release);
  }, [release]);

  const persistRelease = useCallback(async (
    releaseToSave: ReleaseRecord,
    options?: {successMessage?: string | null}
  ) => {
    const snapshot = serializeRelease(releaseToSave);
    const previousSnapshot = lastSavedSnapshotRef.current;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    lastSavedSnapshotRef.current = snapshot;
    setSaveState("saving");

    try {
      const response = await fetch(`/api/releases/${releaseToSave.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: snapshot
      });
      const payload = (await response.json()) as {
        release?: ReleaseRecord;
        message?: string;
      };

      if (!response.ok || !payload.release) {
        throw new Error(payload.message ?? "Save failed.");
      }

      lastSavedSnapshotRef.current = serializeRelease(payload.release);
      setRelease(payload.release);
      setSaveState("saved");
      setHasPendingChanges(latestDraftSnapshotRef.current !== snapshot);

      if (options?.successMessage !== null) {
        setMessage(options?.successMessage ?? "Changes saved.");
      }
    } catch (error) {
      lastSavedSnapshotRef.current = previousSnapshot;
      setSaveState("error");
      setHasPendingChanges(true);
      setMessage(error instanceof Error ? error.message : "Save failed unexpectedly.");
    }
  }, []);

  useEffect(() => {
    const snapshot = serializeRelease(release);

    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistRelease(release, {successMessage: null});
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [persistRelease, release]);

  function updateRelease(mutator: (current: ReleaseRecord) => ReleaseRecord) {
    setRelease((current) => mutator(current));
    setHasPendingChanges(true);
    setMessage(null);
  }

  async function handleManualSave() {
    if (!hasPendingChanges) {
      setMessage("No unsaved changes to save.");
      return;
    }

    await persistRelease(release, {successMessage: "Release saved."});
  }

  async function handleUnlinkProject(projectId: string) {
    setMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          release_id: null
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {message?: string}
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unlink failed.");
      }

      setLinkedProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId)
      );
      setMessage("Clip unlinked from this release.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unlink failed unexpectedly.");
    }
  }

  async function handleUnlinkCopy(copyId: string) {
    setMessage(null);

    try {
      const response = await fetch(`/api/copies/${copyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          release_id: null
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {message?: string}
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unlink failed.");
      }

      setLinkedCopies((currentCopies) => currentCopies.filter((copy) => copy.id !== copyId));
      setMessage("Copy unlinked from this release.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unlink failed unexpectedly.");
    }
  }

  async function handleCoverUpload(file: File) {
    setIsUploadingCover(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/releases/cover-upload", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as {
        asset?: ReleaseCoverUploadResponse["asset"];
        message?: string;
      };

      if (!response.ok || !payload.asset) {
        throw new Error(payload.message ?? "Cover art upload failed.");
      }

      const uploadedAsset = payload.asset;

      updateRelease((current) => ({
        ...current,
        cover_art: uploadedAsset
      }));
      setMessage("Cover art uploaded.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cover art upload failed unexpectedly."
      );
    } finally {
      setIsUploadingCover(false);
    }
  }

  function addTask() {
    if (!taskText.trim()) {
      return;
    }

    updateRelease((current) => ({
      ...current,
      tasks: [...current.tasks, createReleaseTask(taskText.trim())]
    }));
    setTaskText("");
    setMessage(null);
  }

  function handleDeleteTask(taskId: string) {
    const shouldDelete = window.confirm("Delete this task? This cannot be undone.");

    if (!shouldDelete) {
      return;
    }

    updateRelease((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== taskId)
    }));
  }

  async function handleDeleteRelease() {
    const shouldDelete = window.confirm(
      "Delete this release? Linked Lyric Lab projects and Copy Lab entries will be unlinked, not deleted."
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/releases/${release.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as
        | {message?: string}
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Delete failed.");
      }

      router.push("/admin/releases");
      router.refresh();
    } catch (error) {
      setIsDeleting(false);
      setMessage(error instanceof Error ? error.message : "Delete failed unexpectedly.");
    }
  }

  return (
    <main className={`${pageShellClass} px-4 py-5 sm:px-6 lg:px-8`}>
      <div className="mx-auto max-w-[1450px] space-y-6">
        <section className={`${pagePanelClass} overflow-hidden px-6 py-7`}>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className={pagePillClass}>Release Detail</div>
                <div className={pagePillClass}>#{release.id.slice(0, 8)}</div>
                <div className={pagePillClass}>{formatReleaseType(release.type)}</div>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#f1ebdf]">
                {release.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8e939b]">
                Keep the release organized with collaborator info, UPC and ISRC
                metadata, lyrics, cover art, stage completion, and a simple working
                task list.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#31353b] bg-[#111317] p-5">
              <div className="rounded-[22px] border border-[#3a3f46] bg-[#16191d] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className={pageLabelClass}>Progress</p>
                  <span className={pageAccentPillClass}>{progress}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#23262c]">
                  <div
                    className={`h-full rounded-full ${getReleaseProgressTone(progress)}`}
                    style={{width: `${progress}%`}}
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#8d9299]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Stage</span>
                    <span className="font-semibold text-[#efe8db]">{currentStage}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Collaborator</span>
                    <span className="font-semibold text-[#efe8db]">
                      {release.collaborator
                        ? release.collaborator_name || "Yes"
                        : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Autosave</span>
                    <span className="font-semibold text-[#efe8db]">Every minute</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Save status</span>
                    <span className="font-semibold text-[#efe8db]">
                      {saveStatusLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${pagePanelClass} px-6 py-5`}>
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[22px] border border-[#31353b] bg-[#121418] px-4 py-4">
              <p className={pageLabelClass}>Release Snapshot</p>
              <p className="mt-3 text-sm text-[#8b9199]">Current Stage</p>
              <div className="mt-3">
                <span className={pageAccentPillClass}>{snapshotStage}</span>
              </div>
            </div>

            <div className="rounded-[22px] border border-[#31353b] bg-[#121418] px-4 py-4">
              <p className={pageLabelClass}>Next Action</p>
              <p className="mt-3 text-lg font-semibold text-[#efe8db]">
                {snapshotNextAction}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8b9199]">
                Computed from the current stage checklist and release assets already on
                this record.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#31353b] bg-[#121418] px-4 py-4">
              <p className={pageLabelClass}>Blockers</p>
              {snapshotBlockers.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {snapshotBlockers.map((blocker) => (
                    <span
                      className="inline-flex items-center rounded-full border border-[#5a312d] bg-[#1c1313] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#d4a7a0]"
                      key={blocker}
                    >
                      {blocker}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-lg font-semibold text-[#efe8db]">No blockers</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link className={pageTertiaryButtonClass} href="/admin/releases">
            <ArrowLeft size={16} />
            Back to Releases
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className={hasPendingChanges ? pagePrimaryButtonClass : pageSecondaryButtonClass}
              disabled={saveState === "saving" || !hasPendingChanges}
              onClick={() => void handleManualSave()}
              type="button"
            >
              <Save size={16} />
              {saveState === "saving" ? "Saving..." : "Save"}
            </button>

            <button
              className={pageDangerButtonClass}
              disabled={isDeleting}
              onClick={() => void handleDeleteRelease()}
              type="button"
            >
              <Trash2 size={16} />
              {isDeleting ? "Deleting..." : "Delete Release"}
            </button>

            {message ? (
              <span
                className={`rounded-full border px-4 py-2 text-sm ${
                  isErrorMessage
                    ? "border-[#5a312d] bg-[#1c1313] text-[#d4a7a0]"
                    : "border-[#5b4920] bg-[#1a1710] text-[#d7b45e]"
                }`}
              >
                {message}
              </span>
            ) : null}
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className={`${pagePanelClass} space-y-5 px-6 py-6`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={pageLabelClass}>Section 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">Basic Info</h2>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className={pageLabelClass}>Title</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    value={release.title}
                  />
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>Type</span>
                  <select
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        type: event.target.value as ReleaseType
                      }))
                    }
                    value={release.type}
                  >
                    <option value="nerdcore">Nerdcore</option>
                    <option value="mainstream">Mainstream</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>Release Date</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        release_date: event.target.value
                      }))
                    }
                    type="date"
                    value={release.release_date}
                  />
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>Collaborator</span>
                  <select
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        collaborator: event.target.value === "yes",
                        collaborator_name:
                          event.target.value === "yes"
                            ? current.collaborator_name
                            : ""
                      }))
                    }
                    value={release.collaborator ? "yes" : "no"}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                {release.collaborator ? (
                  <label className="space-y-2">
                    <span className={pageLabelClass}>Collaborator Name</span>
                    <input
                      className={pageInputClass}
                      onChange={(event) =>
                        updateRelease((current) => ({
                          ...current,
                          collaborator_name: event.target.value
                        }))
                      }
                      placeholder="Who is the collaborator?"
                      value={release.collaborator_name}
                    />
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className={pageLabelClass}>UPC</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        upc: event.target.value
                      }))
                    }
                    placeholder="Optional UPC"
                    value={release.upc}
                  />
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>ISRC</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        isrc: event.target.value
                      }))
                    }
                    placeholder="Optional ISRC"
                    value={release.isrc}
                  />
                </label>
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">
                  Concept Details
                </h2>
              </div>

              <textarea
                className={`${pageInputClass} min-h-[180px]`}
                onChange={(event) =>
                  updateRelease((current) => ({
                    ...current,
                    concept_details: event.target.value
                  }))
                }
                placeholder="Write the concept, rollout angle, and any important notes here..."
                value={release.concept_details}
              />
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 3</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">Lyrics</h2>
              </div>

              <textarea
                className={`${pageInputClass} min-h-[220px]`}
                onChange={(event) =>
                  updateRelease((current) => ({
                    ...current,
                    lyrics: event.target.value
                  }))
                }
                placeholder="Paste or write the full lyrics here..."
                value={release.lyrics}
              />
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 4</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">Cover Art</h2>
              </div>

              {release.cover_art ? (
                <div className="overflow-hidden rounded-[24px] border border-[#30343b] bg-[#111318]">
                  <div className="relative aspect-square w-full max-w-md">
                    <Image
                      alt={`${release.title} cover art`}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, 420px"
                      src={release.cover_art.url}
                      unoptimized
                    />
                  </div>
                  <div className="border-t border-[#30343b] px-4 py-3">
                    <p className="text-sm font-semibold text-[#ede7db]">
                      {release.cover_art.fileName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#373b42] bg-[#111317] px-5 py-6 text-sm text-[#7f858d]">
                  No cover art uploaded yet.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  className={pagePrimaryButtonClass}
                  href={`/admin/photo-lab?releaseId=${release.id}`}
                >
                  <Sparkles size={16} />
                  Create Cover Art
                </Link>

                <label className={pageSecondaryButtonClass}>
                  <ImagePlus size={16} />
                  {isUploadingCover ? "Uploading cover..." : "Choose Cover Art"}
                  <input
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingCover}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handleCoverUpload(file);
                      }

                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>

                {release.cover_art ? (
                  <button
                    className={pageSecondaryButtonClass}
                    onClick={() =>
                      updateRelease((current) => ({
                        ...current,
                        cover_art: null
                      }))
                    }
                    type="button"
                  >
                    <Trash2 size={16} />
                    Remove Cover
                  </button>
                ) : null}
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 5</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">
                  Streaming Links
                </h2>
                <p className="mt-2 text-sm text-[#8a9098]">
                  Leave these blank until the release is live, then drop in the
                  platform URLs when they are ready.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className={pageLabelClass}>Spotify</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        streaming_links: {
                          ...current.streaming_links,
                          spotify: event.target.value
                        }
                      }))
                    }
                    placeholder="Spotify release link"
                    type="url"
                    value={release.streaming_links.spotify}
                  />
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>Apple Music</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        streaming_links: {
                          ...current.streaming_links,
                          apple_music: event.target.value
                        }
                      }))
                    }
                    placeholder="Apple Music release link"
                    type="url"
                    value={release.streaming_links.apple_music}
                  />
                </label>

                <label className="space-y-2">
                  <span className={pageLabelClass}>YouTube</span>
                  <input
                    className={pageInputClass}
                    onChange={(event) =>
                      updateRelease((current) => ({
                        ...current,
                        streaming_links: {
                          ...current.streaming_links,
                          youtube: event.target.value
                        }
                      }))
                    }
                    placeholder="YouTube release link"
                    type="url"
                    value={release.streaming_links.youtube}
                  />
                </label>
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 6</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">
                  Generated Clips
                </h2>
                <p className="mt-2 text-sm text-[#8a9098]">
                  Any Lyric Lab project started with this release attached appears
                  here automatically.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link className={pagePrimaryButtonClass} href={`/admin/lyric-lab?releaseId=${release.id}`}>
                  <Film size={16} />
                  Create Clip
                </Link>
              </div>

              <div className="space-y-3">
                {linkedProjects.map((linkedProject) => (
                  <article
                    className="rounded-[22px] border border-[#31353b] bg-[#14171b] p-4"
                    key={linkedProject.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#ede7dc]">
                          {linkedProject.title}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={pagePillClass}>
                            Created {formatTimestamp(linkedProject.createdAt)}
                          </span>
                          <span className={pagePillClass}>
                            {linkedProject.aspectRatio}
                          </span>
                          <span className={pagePillClass}>
                            {linkedProject.durationMs
                              ? formatMs(linkedProject.durationMs)
                              : "No audio yet"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          className={pageSecondaryButtonClass}
                          href={`/admin/lyric-lab?projectId=${linkedProject.id}`}
                        >
                          <FolderOpen size={16} />
                          Open
                        </Link>
                        <button
                          className={pageTertiaryButtonClass}
                          onClick={() => void handleUnlinkProject(linkedProject.id)}
                          type="button"
                        >
                          <Link2Off size={16} />
                          Unlink
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {linkedProjects.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#383c43] bg-[#121418] px-4 py-5 text-sm text-[#7f858d]">
                    No Lyric Lab projects are linked to this release yet.
                  </div>
                ) : null}
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 7</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">
                  Copy Pairs
                </h2>
                <p className="mt-2 text-sm text-[#8a9098]">
                  Any Copy Lab entry attached to this release appears here automatically.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className={pagePrimaryButtonClass}
                  href={`/admin/copy-lab/new?releaseId=${release.id}`}
                >
                  <Captions size={16} />
                  Create Copy
                </Link>
              </div>

              <div className="space-y-3">
                {linkedCopies.map((linkedCopy) => (
                  <article
                    className="rounded-[22px] border border-[#31353b] bg-[#14171b] p-4"
                    key={linkedCopy.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[#ede7dc]">
                          {getCopyHeading(linkedCopy)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#8a9098]">
                          {linkedCopy.caption.trim() || "No caption written yet."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={pagePillClass}>
                            {formatCopyType(linkedCopy.type)}
                          </span>
                          <span className={pagePillClass}>
                            Created {formatTimestamp(linkedCopy.created_on)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          className={pageSecondaryButtonClass}
                          href={`/admin/copy-lab/${linkedCopy.id}`}
                        >
                          <FolderOpen size={16} />
                          Open
                        </Link>
                        <button
                          className={pageTertiaryButtonClass}
                          onClick={() => void handleUnlinkCopy(linkedCopy.id)}
                          type="button"
                        >
                          <Link2Off size={16} />
                          Unlink
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {linkedCopies.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#383c43] bg-[#121418] px-4 py-5 text-sm text-[#7f858d]">
                    No Copy Lab entries are linked to this release yet.
                  </div>
                ) : null}
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-4 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 8</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">
                  Stage Completion
                </h2>
                <p className="mt-2 text-sm text-[#8a9098]">
                  Check off each stage as soon as it is done. Progress is calculated
                  from these stage checkboxes and your task list.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {stageFields.map((field) => (
                  <label
                    className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${
                      release[field.key]
                        ? "border-[#5f4b1f] bg-[#1a1710] text-[#efe7d7]"
                        : "border-[#31353b] bg-[#14171b] text-[#d1d5db]"
                    }`}
                    key={field.key}
                  >
                    <input
                      checked={release[field.key]}
                      className={pageCheckboxClass}
                      onChange={(event) =>
                        updateRelease((current) => ({
                          ...current,
                          [field.key]: event.target.checked
                        }))
                      }
                      type="checkbox"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className={`${pagePanelClass} space-y-5 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Record Info</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">Metadata</h2>
              </div>

              <div className="space-y-3 rounded-[22px] border border-[#31353b] bg-[#121418] px-4 py-4 text-sm text-[#aeb3bb]">
                <div className="flex items-center justify-between gap-3">
                  <span className={pageLabelClass}>ID</span>
                  <span className="font-mono text-xs text-[#f0eadf]">{release.id}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={pageLabelClass}>Created On</span>
                  <span className="text-right text-[#ebe4d8]">
                    {formatTimestamp(release.created_on)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={pageLabelClass}>UPC</span>
                  <span className="text-right text-[#ebe4d8]">
                    {release.upc || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={pageLabelClass}>ISRC</span>
                  <span className="text-right text-[#ebe4d8]">
                    {release.isrc || "Not set"}
                  </span>
                </div>
                <div className="space-y-2 border-t border-[#2d3138] pt-3">
                  <span className={pageLabelClass}>Streaming</span>
                  <div className="grid gap-2">
                    {streamingMetadataButtons.map((platform) => {
                      const Icon = platform.icon;
                      const buttonClassName = `inline-flex w-full rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        platform.href
                          ? platform.activeClassName
                          : platform.inactiveClassName
                      }`;

                      if (!platform.href) {
                        return (
                          <div
                            className={`${buttonClassName} items-center justify-between gap-3`}
                            key={platform.label}
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="h-5 w-5 shrink-0" />
                              {platform.label}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                              Not set
                            </span>
                          </div>
                        );
                      }

                      return (
                        <a
                          className={`${buttonClassName} items-center gap-3`}
                          href={platform.href}
                          key={platform.label}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {platform.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className={pageLabelClass}>Updated On</span>
                  <span className="text-right text-[#ebe4d8]">
                    {formatTimestamp(release.updated_on)}
                  </span>
                </div>
              </div>
            </section>

            <section className={`${pagePanelClass} space-y-5 px-6 py-6`}>
              <div>
                <p className={pageLabelClass}>Section 9</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f0eadf]">Tasks</h2>
              </div>

              <div className="flex gap-3">
                <input
                  className={pageInputClass}
                  onChange={(event) => setTaskText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                  placeholder="Add a task"
                  value={taskText}
                />
                <button className={pagePrimaryButtonClass} onClick={addTask} type="button">
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {release.tasks.map((task) => (
                  <div
                    className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 ${
                      task.completed
                        ? "border-[#353941] bg-[#121418]"
                        : "border-[#31353b] bg-[#15181c]"
                    }`}
                    key={task.id}
                  >
                    <input
                      checked={task.completed}
                      className={pageCheckboxClass}
                      onChange={(event) =>
                        updateRelease((current) => ({
                          ...current,
                          tasks: current.tasks.map((item) =>
                            item.id === task.id
                              ? {
                                  ...item,
                                  completed: event.target.checked
                                }
                              : item
                          )
                        }))
                      }
                      type="checkbox"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        task.completed
                          ? "text-[#727780] line-through"
                          : "text-[#e7e1d6]"
                      }`}
                    >
                      {task.text}
                    </span>
                    <button
                      className={pageDangerButtonClass}
                      onClick={() => handleDeleteTask(task.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                ))}

                {release.tasks.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#383c43] bg-[#121418] px-4 py-5 text-sm text-[#7f858d]">
                    No tasks yet. Add the next concrete action to keep the release
                    moving.
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
