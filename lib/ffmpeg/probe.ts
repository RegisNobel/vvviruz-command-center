import "server-only";

import {execa} from "execa";

import {ffprobeExecutable} from "@/lib/ffmpeg/config";

async function probeWithFfprobe(filePath: string) {
  const {stdout} = await execa(ffprobeExecutable, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath
  ]);

  const seconds = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(seconds)) {
    throw new Error("Unable to parse audio duration.");
  }

  return Math.round(seconds * 1000);
}

export async function getAudioDurationMs(filePath: string) {
  try {
    return await probeWithFfprobe(filePath);
  } catch {
    const musicMetadata = (await import("music-metadata")) as unknown as {
      parseFile: (
        path: string,
        options?: Record<string, unknown>
      ) => Promise<{
        format: {
          duration?: number;
        };
      }>;
    };
    const metadata = await musicMetadata.parseFile(filePath, {
      duration: true
    });

    if (!metadata.format.duration) {
      throw new Error("Unable to determine audio duration.");
    }

    return Math.round(metadata.format.duration * 1000);
  }
}
