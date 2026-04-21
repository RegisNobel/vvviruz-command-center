import type {LyricLine} from "@/lib/types";

function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

function toSrtTime(ms: number) {
  const safe = Math.max(0, ms);
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function linesToSrt(lines: LyricLine[]) {
  return lines
    .map((line, index) => {
      return `${index + 1}\n${toSrtTime(line.startMs)} --> ${toSrtTime(
        line.endMs
      )}\n${line.text}`;
    })
    .join("\n\n");
}
