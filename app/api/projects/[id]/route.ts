export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {NextResponse} from "next/server";
import {z} from "zod";

import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {deleteProject, readProject, saveProject} from "@/lib/server/storage";
import {hydrateProject, touchProject} from "@/lib/video/project";

const patchProjectSchema = z.object({
  release_id: z.string().trim().min(1).nullable()
});

export async function GET(
  request: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const {id} = await params;
    const project = hydrateProject(await readProject(id));

    return NextResponse.json({project});
  } catch {
    return NextResponse.json({message: "Project not found."}, {status: 404});
  }
}

export async function DELETE(
  request: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const {id} = await params;

    await deleteProject(id);

    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({message: "Project not found."}, {status: 404});
  }
}

export async function PATCH(
  request: Request,
  {params}: {params: Promise<{id: string}>}
) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const {id} = await params;
    const parsed = patchProjectSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {message: parsed.error.issues[0]?.message ?? "Invalid project update."},
        {status: 400}
      );
    }

    const existingProject = hydrateProject(await readProject(id));
    const updatedProject = touchProject({
      ...existingProject,
      release_id: parsed.data.release_id
    });

    await saveProject(updatedProject);

    return NextResponse.json({project: updatedProject});
  } catch {
    return NextResponse.json({message: "Project not found."}, {status: 404});
  }
}
