export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {MAX_AUDIO_MS} from "@/lib/constants";
import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {ensureStorageDirs} from "@/lib/server/storage";
import type {LyricProject, ResolutionPreset} from "@/lib/types";
import {normalizeLyricPlacement} from "@/lib/video/layout";
import {normalizeLines} from "@/lib/video/project";
import {renderProjectVideo} from "@/lib/video/render";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as {
    project: LyricProject;
    resolution: ResolutionPreset;
  };

  if (!body.project?.audio) {
    return Response.json({message: "Upload audio before exporting."}, {status: 400});
  }

  await ensureStorageDirs();

  const normalizedProject: LyricProject = {
    ...body.project,
    aspectRatio: body.project.aspectRatio ?? "9:16",
    lyricPlacement: normalizeLyricPlacement(body.project.lyricPlacement),
    lines: normalizeLines(
      body.project.lines,
      body.project.audio?.durationMs ?? MAX_AUDIO_MS
    )
  };

  const encoder = new TextEncoder();
  const origin = new URL(request.url).origin;
  const stream = new ReadableStream({
    async start(controller) {
      const push = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        push({
          type: "progress",
          progress: 0.02,
          stage: "Preparing Remotion render"
        });

        const result = await renderProjectVideo({
          project: normalizedProject,
          resolution: body.resolution,
          origin,
          onEvent: push
        });

        push({
          type: "complete",
          downloadUrl: result.downloadUrl,
          fileName: result.fileName
        });
      } catch (error) {
        push({
          type: "error",
          message:
            error instanceof Error ? error.message : "Export failed unexpectedly."
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
