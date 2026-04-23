import fs from "node:fs/promises";
import path from "node:path";

import {fileNameFromPath} from "@/lib/utils";
export {
  deleteProject,
  readProject,
  readProjectSummaries,
  readProjectsByReleaseId,
  saveProject
} from "@/lib/repositories/projects";

export const storageRoot = path.join(process.cwd(), "storage");
export const uploadsDir = path.join(storageRoot, "uploads");
export const exportsDir = path.join(storageRoot, "exports");
export const backgroundsDir = path.join(storageRoot, "backgrounds");
export const releaseCoversDir = path.join(storageRoot, "release-covers");
export const projectsDir = path.join(storageRoot, "projects");
export const releasesDir = path.join(storageRoot, "releases");
export const copiesDir = path.join(storageRoot, "copies");

export async function ensureStorageDirs() {
  await Promise.all([
    fs.mkdir(uploadsDir, {recursive: true}),
    fs.mkdir(exportsDir, {recursive: true}),
    fs.mkdir(backgroundsDir, {recursive: true}),
    fs.mkdir(releaseCoversDir, {recursive: true}),
    fs.mkdir(projectsDir, {recursive: true}),
    fs.mkdir(releasesDir, {recursive: true}),
    fs.mkdir(copiesDir, {recursive: true})
  ]);
}

export function sanitizeAssetId(assetId: string) {
  return fileNameFromPath(assetId);
}

export async function resolveAssetPath(
  kind: "audio" | "background" | "cover" | "export",
  assetId: string
) {
  await ensureStorageDirs();
  const safeAssetId = sanitizeAssetId(assetId);
  const baseDir =
    kind === "audio"
      ? uploadsDir
      : kind === "background"
        ? backgroundsDir
        : kind === "cover"
          ? releaseCoversDir
          : exportsDir;
  const filePath = path.join(baseDir, safeAssetId);

  await fs.access(filePath);

  return filePath;
}
