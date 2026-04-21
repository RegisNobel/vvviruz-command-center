import {
  FRAME_RATE,
  MAX_AUDIO_MS,
  MIN_LINE_MS,
  STYLE_PRESETS,
  defaultBackground,
  defaultLyrics
} from "@/lib/constants";
import type {
  AudioAsset,
  LyricLine,
  LyricProject,
  StylePreset,
  TranscriptionStatus,
  WorkflowStep
} from "@/lib/types";
import {clamp, createId} from "@/lib/utils";
import {defaultLyricPlacement, normalizeLyricPlacement} from "@/lib/video/layout";

function inferWorkflowStep(project: Partial<LyricProject>): WorkflowStep {
  if (!project.audio) {
    return project.release_id === undefined ? "context" : "audio";
  }

  if (!project.audio.trimmed && project.audio.durationMs > MAX_AUDIO_MS) {
    return "trim";
  }

  const hasRealLyrics = project.lines?.some(
    (line) => line.text.trim() && line.text !== "Ready to transcribe."
  );

  return hasRealLyrics ? "edit" : "transcribe";
}

function inferTranscriptionStatus(project: Partial<LyricProject>): TranscriptionStatus {
  if (!project.audio) {
    return "idle";
  }

  if (project.transcriptionStatus) {
    return project.transcriptionStatus;
  }

  return inferWorkflowStep(project) === "transcribe" ? "idle" : "complete";
}

export function createEmptyProject(title = "Untitled Session"): LyricProject {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title,
    release_id: null,
    audio: null,
    lines: [
      {
        id: createId(),
        text: "Your lyrics will appear here.",
        startMs: 0,
        endMs: 2400
      }
    ],
    background: {...defaultBackground},
    lyrics: {...defaultLyrics},
    animationStyle: "karaoke",
    aspectRatio: "9:16",
    lyricPlacement: {...defaultLyricPlacement},
    resolution: "1080p",
    transcriptionLanguage: "auto",
    workflowStep: "context",
    transcriptionStatus: "idle",
    createdAt: now,
    updatedAt: now
  };
}

export function hydrateProject(project: LyricProject): LyricProject {
  return {
    ...project,
    release_id: project.release_id ?? null,
    background: {
      ...defaultBackground,
      ...project.background
    },
    lyrics: {
      ...defaultLyrics,
      ...project.lyrics
    },
    aspectRatio: project.aspectRatio ?? "9:16",
    lyricPlacement: normalizeLyricPlacement(project.lyricPlacement),
    transcriptionLanguage: project.transcriptionLanguage ?? "auto",
    lines: project.lines.length > 0 ? project.lines : createEmptyProject().lines,
    workflowStep: project.workflowStep ?? inferWorkflowStep(project),
    transcriptionStatus: inferTranscriptionStatus(project)
  };
}

export function touchProject(project: LyricProject): LyricProject {
  return {
    ...project,
    updatedAt: new Date().toISOString()
  };
}

export function replaceAudio(
  project: LyricProject,
  audio: AudioAsset,
  title?: string
): LyricProject {
  const needsTrim = !audio.trimmed && audio.durationMs > MAX_AUDIO_MS;

  return touchProject({
    ...project,
    title: title ?? project.title,
    audio,
    lines: [
      {
        id: createId(),
        text: needsTrim ? "Trim the clip to continue." : "Ready to transcribe.",
        startMs: 0,
        endMs: Math.min(audio.durationMs, 2400)
      }
    ],
    workflowStep: needsTrim ? "trim" : "transcribe",
    transcriptionStatus: "idle"
  });
}

export function setWorkflowStep(project: LyricProject, workflowStep: WorkflowStep) {
  return touchProject({
    ...project,
    workflowStep
  });
}

export function setTranscriptionStatus(
  project: LyricProject,
  transcriptionStatus: TranscriptionStatus
) {
  return touchProject({
    ...project,
    transcriptionStatus
  });
}

export function getProjectDurationMs(project: LyricProject) {
  const lastLineEnd = project.lines.reduce((max, line) => Math.max(max, line.endMs), 0);
  const audioDuration = project.audio?.durationMs ?? 0;
  const fallback = Math.max(lastLineEnd + 500, 3_000);

  return clamp(audioDuration || fallback, 3_000, MAX_AUDIO_MS);
}

export function getProjectDurationFrames(project: LyricProject, fps = FRAME_RATE) {
  return Math.max(1, Math.ceil((getProjectDurationMs(project) / 1000) * fps));
}

export function normalizeLines(lines: LyricLine[], maxDurationMs: number) {
  return [...lines]
    .sort((a, b) => a.startMs - b.startMs)
    .map((line) => {
      const startMs = clamp(line.startMs, 0, Math.max(0, maxDurationMs - MIN_LINE_MS));
      const endMs = clamp(
        Math.max(startMs + MIN_LINE_MS, line.endMs),
        startMs + MIN_LINE_MS,
        maxDurationMs
      );

      return {
        ...line,
        text: line.text.trim() || "Untitled line",
        startMs,
        endMs
      };
    });
}

export function applyStylePreset(
  project: LyricProject,
  presetId: string
): LyricProject {
  const preset = STYLE_PRESETS.find((item) => item.id === presetId);

  if (!preset) {
    return project;
  }

  return touchProject({
    ...project,
    animationStyle: preset.animationStyle,
    background: {...preset.background},
    lyrics: {...preset.lyrics}
  });
}

export function getPresetById(presetId: string): StylePreset | undefined {
  return STYLE_PRESETS.find((item) => item.id === presetId);
}

export function splitLine(line: LyricLine) {
  const words = line.text.trim().split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    const midpoint = line.startMs + Math.round((line.endMs - line.startMs) / 2);

    return [
      {
        ...line,
        id: createId(),
        text: `${line.text.trim()} (part 1)`,
        endMs: midpoint
      },
      {
        ...line,
        id: createId(),
        text: "(part 2)",
        startMs: midpoint
      }
    ];
  }

  const midpointIndex = Math.ceil(words.length / 2);
  const midpoint = line.startMs + Math.round((line.endMs - line.startMs) / 2);

  return [
    {
      ...line,
      id: createId(),
      text: words.slice(0, midpointIndex).join(" "),
      endMs: midpoint
    },
    {
      ...line,
      id: createId(),
      text: words.slice(midpointIndex).join(" "),
      startMs: midpoint
    }
  ];
}

export function mergeLines(first: LyricLine, second: LyricLine): LyricLine {
  return {
    id: createId(),
    text: `${first.text} ${second.text}`.replace(/\s+/g, " ").trim(),
    startMs: Math.min(first.startMs, second.startMs),
    endMs: Math.max(first.endMs, second.endMs)
  };
}
