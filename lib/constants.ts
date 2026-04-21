import type {BackgroundStyle, LyricStyle, StylePreset} from "@/lib/types";

export const MAX_AUDIO_MS = 30_000;
export const MIN_LINE_MS = 300;
export const FRAME_RATE = 30;
export const MAX_VIDEO_FRAMES = Math.ceil((MAX_AUDIO_MS / 1000) * FRAME_RATE);
export const AUTOSAVE_INTERVAL_MS = 60_000;

export const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);
export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
export const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm"]);

export const FONT_OPTIONS = [
  {
    label: "Studio Sans",
    value: "\"Trebuchet MS\", \"Segoe UI\", sans-serif"
  },
  {
    label: "Poster Serif",
    value: "Georgia, Cambria, serif"
  },
  {
    label: "Bold Condensed",
    value: "Impact, Haettenschweiler, sans-serif"
  },
  {
    label: "Mono Cue",
    value: "\"Courier New\", monospace"
  }
] as const;

export const defaultBackground: BackgroundStyle = {
  mode: "gradient",
  solidColor: "#132238",
  gradientFrom: "#132238",
  gradientTo: "#ff7a59",
  accentColor: "#79d8c3",
  mediaAsset: null
};

export const defaultLyrics: LyricStyle = {
  fontFamily: FONT_OPTIONS[0].value,
  fontSize: 72,
  color: "#fff8f0",
  inactiveColor: "rgba(255, 248, 240, 0.45)",
  karaokeColor: "#79d8c3",
  strokeColor: "#0f1726",
  strokeWidth: 2,
  shadowColor: "rgba(15, 23, 38, 0.45)",
  shadowBlur: 24,
  alignment: "center",
  lineHeight: 1.12
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "sunset-drive",
    name: "Sunset Drive",
    animationStyle: "karaoke",
    background: {
      mode: "gradient",
      solidColor: "#1a2236",
      gradientFrom: "#1a2236",
      gradientTo: "#ff7a59",
      accentColor: "#ffd166"
    },
    lyrics: {
      ...defaultLyrics,
      fontFamily: FONT_OPTIONS[2].value,
      fontSize: 76,
      karaokeColor: "#ffd166"
    }
  },
  {
    id: "mint-tape",
    name: "Mint Tape",
    animationStyle: "slide-up",
    background: {
      mode: "motion",
      solidColor: "#0b2027",
      gradientFrom: "#0b2027",
      gradientTo: "#2d4f52",
      accentColor: "#79d8c3"
    },
    lyrics: {
      ...defaultLyrics,
      fontFamily: FONT_OPTIONS[0].value,
      color: "#f8fffd",
      karaokeColor: "#79d8c3"
    }
  },
  {
    id: "paper-poem",
    name: "Paper Poem",
    animationStyle: "fade",
    background: {
      mode: "solid",
      solidColor: "#f6efe4",
      gradientFrom: "#f6efe4",
      gradientTo: "#ebdcc4",
      accentColor: "#132238"
    },
    lyrics: {
      ...defaultLyrics,
      fontFamily: FONT_OPTIONS[1].value,
      color: "#132238",
      inactiveColor: "rgba(19, 34, 56, 0.35)",
      karaokeColor: "#ff7a59",
      strokeColor: "#f6efe4",
      shadowColor: "rgba(19, 34, 56, 0.10)"
    }
  },
  {
    id: "night-pulse",
    name: "Night Pulse",
    animationStyle: "pop",
    background: {
      mode: "motion",
      solidColor: "#080d18",
      gradientFrom: "#080d18",
      gradientTo: "#253b56",
      accentColor: "#ff7a59"
    },
    lyrics: {
      ...defaultLyrics,
      fontFamily: FONT_OPTIONS[2].value,
      fontSize: 82,
      color: "#ffffff",
      karaokeColor: "#ff7a59"
    }
  },
  {
    id: "mono-note",
    name: "Mono Note",
    animationStyle: "typewriter",
    background: {
      mode: "gradient",
      solidColor: "#141414",
      gradientFrom: "#141414",
      gradientTo: "#3f3f46",
      accentColor: "#79d8c3"
    },
    lyrics: {
      ...defaultLyrics,
      fontFamily: FONT_OPTIONS[3].value,
      fontSize: 66,
      color: "#fafaf9"
    }
  }
];
