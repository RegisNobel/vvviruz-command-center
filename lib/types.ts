export type LyricLine = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
};

export type WorkflowStep =
  | "context"
  | "audio"
  | "trim"
  | "transcribe"
  | "edit"
  | "style"
  | "export";

export type TranscriptionStatus = "idle" | "running" | "complete" | "failed";

export type TranscriptionLanguage = "auto" | "en" | "fr" | "es";

export type BackgroundMode = "solid" | "gradient" | "motion" | "image" | "video";

export type BackgroundMediaAsset = {
  id: string;
  fileName: string;
  url: string;
  mediaType: "image" | "video";
  mimeType: string;
};

export type TextAlignment = "left" | "center" | "right";

export type AnimationStyle =
  | "fade"
  | "slide-up"
  | "pop"
  | "typewriter"
  | "karaoke";

export type ResolutionPreset = "720p" | "1080p";

export type PreviewAspectRatio = "9:16" | "16:9";

export type LyricPlacement = {
  x: number;
  y: number;
};

export type BackgroundStyle = {
  mode: BackgroundMode;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  mediaAsset?: BackgroundMediaAsset | null;
};

export type LyricStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  inactiveColor: string;
  karaokeColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  alignment: TextAlignment;
  lineHeight: number;
};

export type AudioAsset = {
  id: string;
  fileName: string;
  url: string;
  durationMs: number;
  originalDurationMs: number;
  trimmed: boolean;
};

export type LyricProject = {
  id: string;
  title: string;
  release_id: string | null;
  audio: AudioAsset | null;
  lines: LyricLine[];
  background: BackgroundStyle;
  lyrics: LyricStyle;
  animationStyle: AnimationStyle;
  aspectRatio: PreviewAspectRatio;
  lyricPlacement: LyricPlacement;
  resolution: ResolutionPreset;
  transcriptionLanguage: TranscriptionLanguage;
  workflowStep: WorkflowStep;
  transcriptionStatus: TranscriptionStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  title: string;
  release_id: string | null;
  createdAt: string;
  updatedAt: string;
  hasAudio: boolean;
  durationMs: number | null;
  aspectRatio: PreviewAspectRatio;
  lineCount: number;
  workflowStep: WorkflowStep;
};

export type UploadResponse = {
  audio: AudioAsset;
  requiresTrim: boolean;
};

export type BackgroundUploadResponse = {
  asset: BackgroundMediaAsset;
};

export type ReleaseStatus =
  | "Concept Complete"
  | "Beat Made"
  | "Lyrics Finished"
  | "Recorded"
  | "Mix/Mastered"
  | "Published";

export type ReleaseStageLabel =
  | "Concept"
  | "Cover Art"
  | "Beat Made"
  | "Lyrics"
  | "Recorded"
  | "Mix/Mastered"
  | "Published"
  | "Not Started";

export type ReleaseType = "nerdcore" | "mainstream";

export type ReleaseTask = {
  id: string;
  text: string;
  completed: boolean;
};

export type ReleaseCoverAsset = {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
};

export type ReleaseStreamingLinks = {
  spotify: string;
  apple_music: string;
  youtube: string;
};

export type ReleaseRecord = {
  id: string;
  title: string;
  pinned: boolean;
  collaborator: boolean;
  collaborator_name: string;
  upc: string;
  isrc: string;
  cover_art: ReleaseCoverAsset | null;
  streaming_links: ReleaseStreamingLinks;
  lyrics: string;
  type: ReleaseType;
  release_date: string;
  concept_details: string;
  concept_complete: boolean;
  beat_made: boolean;
  lyrics_finished: boolean;
  recorded: boolean;
  mix_mastered: boolean;
  published: boolean;
  tasks: ReleaseTask[];
  created_on: string;
  updated_on: string;
};

export type ReleaseSummary = {
  id: string;
  title: string;
  pinned: boolean;
  type: ReleaseType;
  status: ReleaseStageLabel;
  release_date: string;
  progress_percentage: number;
  updated_on: string;
};

export type ReleaseCoverUploadResponse = {
  asset: ReleaseCoverAsset;
};

export type CopyType =
  | "neutral"
  | "curiosity"
  | "contrarian-opinion"
  | "relatable-pain"
  | "listicle-numbered"
  | "direct-actionable"
  | "mistake-regret"
  | "before-after-result";

export type CopyRecord = {
  id: string;
  release_id: string | null;
  hook: string;
  caption: string;
  type: CopyType;
  created_on: string;
  updated_on: string;
};

export type CopySummary = {
  id: string;
  release_id: string | null;
  hook: string;
  caption: string;
  type: CopyType;
  created_on: string;
  updated_on: string;
};

export type TranscriptionResponse = {
  fullText: string;
  lines: LyricLine[];
};

export type ExportStreamEvent =
  | {
      type: "progress";
      progress: number;
      renderedFrames?: number;
      encodedFrames?: number;
      stage?: string;
    }
  | {
      type: "complete";
      downloadUrl: string;
      fileName: string;
    }
  | {
      type: "error";
      message: string;
    };

export type StylePreset = {
  id: string;
  name: string;
  animationStyle: AnimationStyle;
  background: BackgroundStyle;
  lyrics: LyricStyle;
};

export type RenderVideoProps = {
  project: LyricProject;
  audioSrc: string | null;
};
