import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {hydrateRelease, summarizeRelease} from "@/lib/releases";
import {releasesDir, ensureStorageDirs} from "@/lib/server/storage";
import type {ReleaseRecord, ReleaseSummary} from "@/lib/types";
import {fileNameFromPath} from "@/lib/utils";

function getReleaseFilePath(releaseId: string) {
  const safeId = fileNameFromPath(releaseId).replace(/\.json$/i, "");

  return path.join(releasesDir, `${safeId}.json`);
}

export async function readReleaseSummaries(): Promise<ReleaseSummary[]> {
  await ensureStorageDirs();

  const files = await fs.readdir(releasesDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  const releases = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const raw = await fs.readFile(path.join(releasesDir, fileName), "utf8");

      return summarizeRelease(hydrateRelease(JSON.parse(raw) as ReleaseRecord));
    })
  );

  return releases.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    return b.updated_on.localeCompare(a.updated_on);
  });
}

export async function readRelease(releaseId: string): Promise<ReleaseRecord> {
  await ensureStorageDirs();
  const raw = await fs.readFile(getReleaseFilePath(releaseId), "utf8");

  return hydrateRelease(JSON.parse(raw) as ReleaseRecord);
}

export async function saveRelease(release: ReleaseRecord) {
  await ensureStorageDirs();
  const filePath = getReleaseFilePath(release.id);

  await fs.writeFile(filePath, JSON.stringify(release, null, 2), "utf8");

  return filePath;
}

export async function deleteRelease(releaseId: string) {
  await ensureStorageDirs();

  await fs.unlink(getReleaseFilePath(releaseId));
}
