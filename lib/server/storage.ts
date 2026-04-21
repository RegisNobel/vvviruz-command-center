import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type {LyricProject, ProjectSummary} from "@/lib/types";
import {fileNameFromPath} from "@/lib/utils";
import {hydrateProject} from "@/lib/video/project";

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

function summarizeProject(project: LyricProject): ProjectSummary {
  const hydratedProject = hydrateProject(project);

  return {
    id: hydratedProject.id,
    title: hydratedProject.title,
    release_id: hydratedProject.release_id,
    createdAt: hydratedProject.createdAt,
    updatedAt: hydratedProject.updatedAt,
    hasAudio: Boolean(hydratedProject.audio),
    durationMs: hydratedProject.audio?.durationMs ?? null,
    aspectRatio: hydratedProject.aspectRatio,
    lineCount: hydratedProject.lines.length,
    workflowStep: hydratedProject.workflowStep
  } satisfies ProjectSummary;
}

export async function readProjectSummaries(): Promise<ProjectSummary[]> {
  await ensureStorageDirs();

  const files = await fs.readdir(projectsDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  const projects = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const project = JSON.parse(
        await fs.readFile(path.join(projectsDir, fileName), "utf8")
      ) as LyricProject;

      return summarizeProject(project);
    })
  );

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readProjectsByReleaseId(releaseId: string): Promise<ProjectSummary[]> {
  const projects = await readProjectSummaries();

  return projects
    .filter((project) => project.release_id === releaseId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProject(project: LyricProject) {
  await ensureStorageDirs();
  const filePath = path.join(projectsDir, `${project.id}.json`);

  await fs.writeFile(filePath, JSON.stringify(project, null, 2), "utf8");

  return filePath;
}

export async function readProject(projectId: string) {
  await ensureStorageDirs();
  const safeId = fileNameFromPath(projectId).replace(/\.json$/i, "");
  const filePath = path.join(projectsDir, `${safeId}.json`);
  const raw = await fs.readFile(filePath, "utf8");

  return JSON.parse(raw) as LyricProject;
}

export async function deleteProject(projectId: string) {
  await ensureStorageDirs();
  const safeId = fileNameFromPath(projectId).replace(/\.json$/i, "");
  const filePath = path.join(projectsDir, `${safeId}.json`);

  await fs.unlink(filePath);
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
