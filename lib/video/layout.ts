import type {LyricPlacement, PreviewAspectRatio} from "@/lib/types";
import {clamp} from "@/lib/utils";

const portraitDimensions = {
  width: 1080,
  height: 1920
} as const;

const landscapeDimensions = {
  width: 1920,
  height: 1080
} as const;

export const defaultLyricPlacement: LyricPlacement = {
  x: 0.5,
  y: 0.72
};

export function getAspectRatioDimensions(aspectRatio: PreviewAspectRatio) {
  return aspectRatio === "16:9" ? landscapeDimensions : portraitDimensions;
}

export function normalizeLyricPlacement(
  placement?: Partial<LyricPlacement> | null
): LyricPlacement {
  return {
    x: clamp(placement?.x ?? defaultLyricPlacement.x, 0, 1),
    y: clamp(placement?.y ?? defaultLyricPlacement.y, 0, 1)
  };
}

export function getLyricBoxMetrics(
  aspectRatio: PreviewAspectRatio,
  width: number,
  height: number
) {
  const framePaddingX = width * (aspectRatio === "16:9" ? 0.06 : 0.08);
  const framePaddingY = height * 0.08;
  const safeWidth = Math.max(0, width - framePaddingX * 2);
  const safeHeight = Math.max(0, height - framePaddingY * 2);
  const boxWidth = safeWidth * (aspectRatio === "16:9" ? 0.58 : 0.84);
  const boxHeight = safeHeight * (aspectRatio === "16:9" ? 0.34 : 0.28);

  return {
    framePaddingX,
    framePaddingY,
    safeWidth,
    safeHeight,
    boxWidth,
    boxHeight,
    maxOffsetX: Math.max(0, safeWidth - boxWidth),
    maxOffsetY: Math.max(0, safeHeight - boxHeight)
  };
}

export function resolveLyricBoxPlacement({
  aspectRatio,
  placement,
  width,
  height
}: {
  aspectRatio: PreviewAspectRatio;
  placement?: Partial<LyricPlacement> | null;
  width: number;
  height: number;
}) {
  const metrics = getLyricBoxMetrics(aspectRatio, width, height);
  const normalizedPlacement = normalizeLyricPlacement(placement);

  return {
    ...metrics,
    placement: normalizedPlacement,
    left:
      metrics.framePaddingX + normalizedPlacement.x * metrics.maxOffsetX,
    top:
      metrics.framePaddingY + normalizedPlacement.y * metrics.maxOffsetY
  };
}
