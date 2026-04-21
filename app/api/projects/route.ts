export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {NextResponse} from "next/server";

import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {MAX_AUDIO_MS} from "@/lib/constants";
import {readProjectSummaries, saveProject} from "@/lib/server/storage";
import type {LyricProject} from "@/lib/types";
import {hydrateProject, normalizeLines, touchProject} from "@/lib/video/project";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  const projects = await readProjectSummaries();

  return NextResponse.json({projects});
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  const project = hydrateProject((await request.json()) as LyricProject);
  const maxDuration = project.audio?.durationMs ?? MAX_AUDIO_MS;
  const normalized = touchProject({
    ...project,
    lines: normalizeLines(project.lines, maxDuration)
  });

  await saveProject(normalized);

  return NextResponse.json({project: normalized});
}
