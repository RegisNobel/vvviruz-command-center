import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {
  toCaptions,
  transcribe,
  type Language as WhisperLanguage
} from "@remotion/install-whisper-cpp";

import {MAX_AUDIO_MS} from "@/lib/constants";
import {convertAudioForWhisper} from "@/lib/ffmpeg/trim";
import type {LyricLine, TranscriptionLanguage} from "@/lib/types";
import {createId} from "@/lib/utils";

const whisperPath = path.join(process.cwd(), "whisper.cpp");
const whisperVersion = "1.5.5";
const multilingualModel = "medium";
const englishModel = "medium.en";

const languageMap: Record<TranscriptionLanguage, WhisperLanguage> = {
  auto: "auto",
  en: "en",
  fr: "fr",
  es: "es"
};

async function findInstalledModel(model: typeof multilingualModel | typeof englishModel) {
  const modelFileName = `ggml-${model}.bin`;
  const candidatePaths = [
    path.join(whisperPath, modelFileName),
    path.join(whisperPath, "models", modelFileName)
  ];

  for (const modelPath of candidatePaths) {
    try {
      await fs.access(modelPath);
      return {
        model
      };
    } catch {
      // Try the next known install location.
    }
  }

  return null;
}

async function resolveWhisperModel(language: TranscriptionLanguage) {
  const multilingual = await findInstalledModel(multilingualModel);
  const english = await findInstalledModel(englishModel);

  if (language === "en") {
    if (english) {
      return {
        model: english.model,
        language: languageMap[language]
      };
    }

    if (multilingual) {
      return {
        model: multilingual.model,
        language: languageMap[language]
      };
    }
  }

  if (multilingual) {
    return {
      model: multilingual.model,
      language: languageMap[language]
    };
  }

  if (english && language === "en") {
    return {
      model: english.model,
      language: languageMap[language]
    };
  }

  if (language === "auto" || language === "fr" || language === "es") {
    throw new Error(
      "French, Spanish, and mixed-language transcription need the multilingual Whisper model. Run `npm run setup:whisper` again."
    );
  }

  throw new Error(
    "Local Whisper is not installed yet. Run `npm run setup:whisper` first."
  );
}

function groupCaptionsIntoLines(
  captions: Array<{text: string; startMs: number; endMs: number}>
) {
  const lines: LyricLine[] = [];
  let current: Array<{text: string; startMs: number; endMs: number}> = [];

  const pushCurrent = () => {
    if (current.length === 0) {
      return;
    }

    const text = current
      .map((word) => word.text)
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      current = [];
      return;
    }

    lines.push({
      id: createId(),
      text,
      startMs: current[0].startMs,
      endMs: current[current.length - 1].endMs
    });

    current = [];
  };

  for (const caption of captions) {
    const pause = current.length
      ? caption.startMs - current[current.length - 1].endMs
      : 0;
    const nextText = [...current, caption]
      .map((word) => word.text)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    const nextDuration = current.length
      ? caption.endMs - current[0].startMs
      : caption.endMs - caption.startMs;

    if (
      current.length > 0 &&
      (pause > 380 || nextText.length > 30 || nextDuration > 2_800)
    ) {
      pushCurrent();
    }

    current.push(caption);
  }

  pushCurrent();

  return lines
    .filter((line) => line.endMs > line.startMs)
    .map((line) => ({
      ...line,
      endMs: Math.min(MAX_AUDIO_MS, line.endMs)
    }));
}

export async function transcribeAudioToLyrics(
  inputPath: string,
  language: TranscriptionLanguage
) {
  const resolvedModel = await resolveWhisperModel(language);

  const tempPath = path.join(
    process.cwd(),
    "storage",
    "uploads",
    `whisper-input-${createId()}.wav`
  );

  try {
    await convertAudioForWhisper({
      inputPath,
      outputPath: tempPath
    });

    const whisperOutput = await transcribe({
      inputPath: tempPath,
      whisperPath,
      whisperCppVersion: whisperVersion,
      model: resolvedModel.model,
      tokenLevelTimestamps: true,
      language: resolvedModel.language,
      splitOnWord: true,
      printOutput: false
    });

    const {captions} = toCaptions({
      whisperCppOutput: whisperOutput
    });

    const groupedLines = groupCaptionsIntoLines(
      captions.map((caption) => ({
        text: caption.text,
        startMs: caption.startMs,
        endMs: caption.endMs
      }))
    );

    return {
      fullText: groupedLines.map((line) => line.text).join("\n"),
      lines: groupedLines
    };
  } finally {
    await fs.rm(tempPath, {force: true});
  }
}
