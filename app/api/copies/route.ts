export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {NextResponse} from "next/server";
import {z} from "zod";

import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {copyTypeOptions, createEmptyCopy, summarizeCopy, touchCopy} from "@/lib/copy";
import {readCopySummaries, saveCopy} from "@/lib/server/copies";

const createCopySchema = z.object({
  hook: z.string().trim().min(1, "Hook is required."),
  caption: z.string().trim().min(1, "Caption is required."),
  type: z.enum(copyTypeOptions).default("neutral"),
  release_id: z.string().trim().min(1).nullable().default(null)
});

export async function GET(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  const copies = await readCopySummaries();

  return NextResponse.json({copies});
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  const json = await request.json();
  const parsed = createCopySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {message: parsed.error.issues[0]?.message ?? "Invalid copy payload."},
      {status: 400}
    );
  }

  const copy = touchCopy(createEmptyCopy(parsed.data));

  await saveCopy(copy);

  return NextResponse.json({
    copy,
    summary: summarizeCopy(copy)
  });
}
