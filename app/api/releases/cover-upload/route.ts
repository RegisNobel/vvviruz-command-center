export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";

import {NextResponse} from "next/server";

import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {IMAGE_EXTENSIONS} from "@/lib/constants";
import {ensureStorageDirs, releaseCoversDir} from "@/lib/server/storage";
import type {ReleaseCoverUploadResponse} from "@/lib/types";

const mimeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export async function POST(request: Request) {
  const auth = await requireAuthenticatedApiRequest(request);

  if (auth instanceof Response) {
    return auth;
  }

  await ensureStorageDirs();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({message: "Cover art file is required."}, {status: 400});
  }

  const detectedExtension =
    path.extname(file.name).toLowerCase() || mimeToExtension[file.type];

  if (!detectedExtension || !IMAGE_EXTENSIONS.has(detectedExtension)) {
    return NextResponse.json(
      {message: "Choose a jpg, jpeg, png, or webp image for the cover art."},
      {status: 400}
    );
  }

  const storedFileName = `${crypto.randomUUID()}${detectedExtension}`;
  const filePath = path.join(releaseCoversDir, storedFileName);

  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const payload: ReleaseCoverUploadResponse = {
    asset: {
      id: storedFileName,
      fileName: file.name,
      url: `/api/assets/cover/${storedFileName}`,
      mimeType: file.type || "image/*"
    }
  };

  return NextResponse.json(payload);
}
