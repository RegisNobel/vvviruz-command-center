import "server-only";

import path from "node:path";

import {execa} from "execa";

import {ffmpegExecutable} from "@/lib/ffmpeg/config";

export async function trimAudioClip({
  inputPath,
  outputPath,
  startMs,
  endMs
}: {
  inputPath: string;
  outputPath: string;
  startMs: number;
  endMs: number;
}) {
  const durationSeconds = Math.max(0.1, (endMs - startMs) / 1000);

  await execa(ffmpegExecutable, [
    "-y",
    "-i",
    inputPath,
    "-ss",
    (startMs / 1000).toFixed(3),
    "-t",
    durationSeconds.toFixed(3),
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath
  ]);

  return outputPath;
}

export async function convertAudioForWhisper({
  inputPath,
  outputPath
}: {
  inputPath: string;
  outputPath: string;
}) {
  await execa(ffmpegExecutable, [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-sample_fmt",
    "s16",
    "-c:a",
    "pcm_s16le",
    outputPath
  ]);

  return path.resolve(outputPath);
}
