import {Composition, type CalculateMetadataFunction} from "remotion";

import {FRAME_RATE, MAX_VIDEO_FRAMES} from "@/lib/constants";
import type {RenderVideoProps} from "@/lib/types";
import {getAspectRatioDimensions} from "@/lib/video/layout";
import {createEmptyProject} from "@/lib/video/project";
import {LyricVideoTemplate} from "@/remotion/templates/lyric-video";

const calculateMetadata: CalculateMetadataFunction<RenderVideoProps> = ({props}) => {
  const {width, height} = getAspectRatioDimensions(props.project.aspectRatio);

  return {
    width,
    height
  };
};

export function RemotionRoot() {
  return (
    <Composition
      calculateMetadata={calculateMetadata}
      component={LyricVideoTemplate}
      defaultProps={{
        project: createEmptyProject("LyricLab Preview"),
        audioSrc: null
      }}
      durationInFrames={MAX_VIDEO_FRAMES}
      fps={FRAME_RATE}
      id="LyricLabComposition"
    />
  );
}
