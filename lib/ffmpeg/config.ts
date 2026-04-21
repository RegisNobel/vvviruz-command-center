import "server-only";

import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

export const ffmpegExecutable = ffmpegPath as string;
export const ffprobeExecutable = ffprobe.path;

if (!ffmpegExecutable) {
  throw new Error("FFmpeg binary could not be resolved.");
}

if (!ffprobeExecutable) {
  throw new Error("FFprobe binary could not be resolved.");
}
