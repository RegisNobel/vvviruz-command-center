import {AbsoluteFill, Img, Video, interpolate, useCurrentFrame} from "remotion";

import type {BackgroundStyle} from "@/lib/types";

type BackgroundLayerProps = {
  background: BackgroundStyle;
};

export function BackgroundLayer({background}: BackgroundLayerProps) {
  const frame = useCurrentFrame();
  const mediaAsset = background.mediaAsset ?? null;
  const driftX = interpolate(Math.sin(frame / 35), [-1, 1], [-90, 90]);
  const driftY = interpolate(Math.cos(frame / 55), [-1, 1], [-70, 70]);
  const pulse = interpolate(Math.sin(frame / 40), [-1, 1], [0.92, 1.08]);

  if (background.mode === "solid") {
    return <AbsoluteFill style={{backgroundColor: background.solidColor}} />;
  }

  if (background.mode === "gradient") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${background.gradientFrom}, ${background.gradientTo})`
        }}
      />
    );
  }

  if (background.mode === "image" && mediaAsset?.mediaType === "image") {
    return (
      <AbsoluteFill style={{backgroundColor: background.solidColor, overflow: "hidden"}}>
        <Img
          src={mediaAsset.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </AbsoluteFill>
    );
  }

  if (background.mode === "video" && mediaAsset?.mediaType === "video") {
    return (
      <AbsoluteFill style={{backgroundColor: background.solidColor, overflow: "hidden"}}>
        <Video
          loop
          muted
          playsInline
          src={mediaAsset.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      </AbsoluteFill>
    );
  }

  if (background.mode === "image" || background.mode === "video") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, ${background.gradientFrom}, ${background.gradientTo})`
        }}
      />
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${background.gradientFrom}, ${background.gradientTo})`,
        overflow: "hidden"
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${driftX}px, ${driftY}px) scale(${pulse})`,
          opacity: 0.85
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 120,
            left: -80,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: `${background.accentColor}88`,
            filter: "blur(70px)"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -120,
            top: 480,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: `${background.gradientTo}80`,
            filter: "blur(76px)"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 280,
            bottom: -90,
            width: 640,
            height: 420,
            borderRadius: "45% 55% 60% 40%",
            background: `${background.gradientFrom}88`,
            filter: "blur(60px)"
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
