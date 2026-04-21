export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";

import {NextResponse} from "next/server";

import {requireAuthenticatedApiRequest} from "@/lib/auth/server";
import {IMAGE_EXTENSIONS, VIDEO_EXTENSIONS} from "@/lib/constants";
import {backgroundsDir, ensureStorageDirs} from "@/lib/server/storage";
import type {BackgroundUploadResponse} from "@/lib/types";

const mimeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm"
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
    return NextResponse.json({message: "Background file is required."}, {status: 400});
  }

  const detectedExtension =
    path.extname(file.name).toLowerCase() || mimeToExtension[file.type];

  if (!detectedExtension) {
    return NextResponse.json(
      {message: "Only image and video background uploads are supported."},
      {status: 400}
    );
  }

  const isImage = IMAGE_EXTENSIONS.has(detectedExtension);
  const isVideo = VIDEO_EXTENSIONS.has(detectedExtension);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      {
        message:
          "Choose a jpg, png, webp, mp4, mov, or webm file for the background."
      },
      {status: 400}
    );
  }

  const storedFileName = `${crypto.randomUUID()}${detectedExtension}`;
  const filePath = path.join(backgroundsDir, storedFileName);

  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const payload: BackgroundUploadResponse = {
    asset: {
      id: storedFileName,
      fileName: file.name,
      url: `/api/assets/background/${storedFileName}`,
      mediaType: isImage ? "image" : "video",
      mimeType: file.type || (isImage ? "image/*" : "video/*")
    }
  };

  return NextResponse.json(payload);
}
