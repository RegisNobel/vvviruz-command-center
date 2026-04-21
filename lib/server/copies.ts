import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {hydrateCopy, summarizeCopy} from "@/lib/copy";
import {copiesDir, ensureStorageDirs} from "@/lib/server/storage";
import type {CopyRecord, CopySummary} from "@/lib/types";
import {fileNameFromPath} from "@/lib/utils";

function getCopyFilePath(copyId: string) {
  const safeId = fileNameFromPath(copyId).replace(/\.json$/i, "");

  return path.join(copiesDir, `${safeId}.json`);
}

export async function readCopySummaries(): Promise<CopySummary[]> {
  await ensureStorageDirs();

  const files = await fs.readdir(copiesDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  const copies = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const raw = await fs.readFile(path.join(copiesDir, fileName), "utf8");

      return summarizeCopy(hydrateCopy(JSON.parse(raw) as CopyRecord));
    })
  );

  return copies.sort((a, b) => b.updated_on.localeCompare(a.updated_on));
}

export async function readCopiesByReleaseId(releaseId: string): Promise<CopySummary[]> {
  const copies = await readCopySummaries();

  return copies
    .filter((copy) => copy.release_id === releaseId)
    .sort((a, b) => b.updated_on.localeCompare(a.updated_on));
}

export async function readCopy(copyId: string): Promise<CopyRecord> {
  await ensureStorageDirs();
  const raw = await fs.readFile(getCopyFilePath(copyId), "utf8");

  return hydrateCopy(JSON.parse(raw) as CopyRecord);
}

export async function saveCopy(copy: CopyRecord) {
  await ensureStorageDirs();
  const filePath = getCopyFilePath(copy.id);

  await fs.writeFile(filePath, JSON.stringify(copy, null, 2), "utf8");

  return filePath;
}

export async function deleteCopy(copyId: string) {
  await ensureStorageDirs();

  await fs.unlink(getCopyFilePath(copyId));
}
