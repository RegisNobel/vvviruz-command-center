import {AbsoluteFill, Audio, useCurrentFrame, useVideoConfig} from "remotion";

import type {LyricLine, RenderVideoProps} from "@/lib/types";
import {clamp} from "@/lib/utils";
import {resolveLyricBoxPlacement} from "@/lib/video/layout";
import {AnimatedLine} from "@/remotion/components/animated-line";
import {BackgroundLayer} from "@/remotion/components/background-layer";

function getActiveLineIndex(lines: LyricLine[], currentMs: number) {
  const directHit = lines.findIndex(
    (line) => currentMs >= line.startMs && currentMs < line.endMs
  );

  if (directHit >= 0) {
    return directHit;
  }

  if (currentMs < lines[0].startMs) {
    return 0;
  }

  return Math.max(0, lines.length - 1);
}

function getAlignment(alignment: RenderVideoProps["project"]["lyrics"]["alignment"]) {
  switch (alignment) {
    case "left":
      return "flex-start";
    case "right":
      return "flex-end";
    default:
      return "center";
  }
}

export function LyricVideoTemplate({project, audioSrc}: RenderVideoProps) {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const lines = project.lines.length
    ? project.lines
    : [
        {
          id: "placeholder",
          text: "Add lyrics to begin.",
          startMs: 0,
          endMs: 2_000
        }
  ];
  const activeIndex = getActiveLineIndex(lines, currentMs);
  const activeLine = lines[activeIndex];
  const progress = activeLine
    ? clamp(
        (currentMs - activeLine.startMs) / (activeLine.endMs - activeLine.startMs),
        0,
        1
      )
    : 0;
  const lyricBox = resolveLyricBoxPlacement({
    aspectRatio: project.aspectRatio,
    placement: project.lyricPlacement,
    width,
    height
  });
  const boxPadding = Math.max(20, Math.round(width * 0.015));
  const lineGap = Math.max(18, Math.round(height * 0.013));

  return (
    <AbsoluteFill>
      <BackgroundLayer background={project.background} />
      {audioSrc ? <Audio src={audioSrc} /> : null}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.00) 28%, rgba(0, 0, 0, 0.26) 100%)"
        }}
      />

      <AbsoluteFill
        style={{
          paddingTop: lyricBox.framePaddingY,
          paddingLeft: lyricBox.framePaddingX,
          paddingRight: lyricBox.framePaddingX
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <div
            style={{
              borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.16)",
              color: "#fff8f0",
              padding: "12px 18px",
              backdropFilter: "blur(10px)",
              fontFamily: "\"Trebuchet MS\", sans-serif",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: 18
            }}
          >
            LyricLab
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: lyricBox.left,
            top: lyricBox.top,
            width: lyricBox.boxWidth,
            minHeight: lyricBox.boxHeight,
            display: "flex",
            flexDirection: "column",
            gap: lineGap,
            alignItems: getAlignment(project.lyrics.alignment),
            justifyContent: "flex-end",
            padding: boxPadding
          }}
        >
          <AnimatedLine
            animationStyle={project.animationStyle}
            isActive
            lyrics={project.lyrics}
            progress={progress}
            text={activeLine?.text ?? ""}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
