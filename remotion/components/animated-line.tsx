import type {CSSProperties} from "react";

import {interpolate} from "remotion";

import type {AnimationStyle, LyricStyle} from "@/lib/types";

type AnimatedLineProps = {
  text: string;
  isActive: boolean;
  progress: number;
  animationStyle: AnimationStyle;
  lyrics: LyricStyle;
};

function getAlignment(alignment: LyricStyle["alignment"]) {
  switch (alignment) {
    case "left":
      return "flex-start";
    case "right":
      return "flex-end";
    default:
      return "center";
  }
}

export function AnimatedLine({
  text,
  isActive,
  progress,
  animationStyle,
  lyrics
}: AnimatedLineProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const opacity = isActive
    ? interpolate(safeProgress, [0, 0.12, 1], [0.25, 1, 1])
    : 0.42;
  const translateY =
    animationStyle === "slide-up" && isActive
      ? interpolate(safeProgress, [0, 1], [36, 0])
      : 0;
  const scale =
    animationStyle === "pop" && isActive
      ? interpolate(safeProgress, [0, 0.3, 1], [0.86, 1.07, 1])
      : 1;
  const visibleText =
    animationStyle === "typewriter" && isActive
      ? text.slice(0, Math.max(1, Math.ceil(text.length * safeProgress)))
      : text;
  const sharedStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    justifyContent: getAlignment(lyrics.alignment),
    textAlign: lyrics.alignment,
    width: "100%",
    fontFamily: lyrics.fontFamily,
    fontSize: isActive ? lyrics.fontSize : lyrics.fontSize * 0.62,
    lineHeight: lyrics.lineHeight,
    color: isActive ? lyrics.color : lyrics.inactiveColor,
    WebkitTextStroke:
      lyrics.strokeWidth > 0 ? `${lyrics.strokeWidth}px ${lyrics.strokeColor}` : undefined,
    textShadow:
      lyrics.shadowBlur > 0
        ? `0 0 ${lyrics.shadowBlur}px ${lyrics.shadowColor}`
        : undefined,
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    fontWeight: 700
  };

  if (animationStyle === "karaoke" && isActive) {
    return (
      <div style={sharedStyle}>
        <span style={{color: lyrics.inactiveColor}}>{text}</span>
        <span
          style={{
            position: "absolute",
            inset: 0,
            width: `${safeProgress * 100}%`,
            overflow: "hidden",
            color: lyrics.karaokeColor,
            whiteSpace: "nowrap"
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  return <div style={sharedStyle}>{visibleText}</div>;
}
