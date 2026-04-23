import type {LyricProject as PrismaLyricProject, Prisma} from "@prisma/client";

import {prisma} from "@/lib/db/prisma";
import {parseJson, serializeJson, toDate} from "@/lib/db/serialization";
import type {
  AudioAsset,
  BackgroundStyle,
  LyricLine,
  LyricPlacement,
  LyricProject,
  LyricStyle,
  ProjectSummary
} from "@/lib/types";
import {hydrateProject} from "@/lib/video/project";

const projectInclude = {
  lines: {
    orderBy: {
      sortOrder: "asc"
    }
  }
} satisfies Prisma.LyricProjectInclude;

type ProjectWithLines = Prisma.LyricProjectGetPayload<{
  include: typeof projectInclude;
}>;

function toProjectRecord(project: ProjectWithLines): LyricProject {
  return hydrateProject({
    id: project.id,
    title: project.title,
    release_id: project.releaseId,
    audio: parseJson<AudioAsset | null>(project.audioJson, null),
    lines: project.lines.map((line) => ({
      id: line.id,
      text: line.text,
      startMs: line.startMs,
      endMs: line.endMs
    })),
    background: parseJson<BackgroundStyle>(project.backgroundJson, {} as BackgroundStyle),
    lyrics: parseJson<LyricStyle>(project.lyricsJson, {} as LyricStyle),
    animationStyle: project.animationStyle as LyricProject["animationStyle"],
    aspectRatio: project.aspectRatio as LyricProject["aspectRatio"],
    lyricPlacement: parseJson<LyricPlacement>(
      project.lyricPlacementJson,
      {} as LyricPlacement
    ),
    resolution: project.resolution as LyricProject["resolution"],
    transcriptionLanguage:
      project.transcriptionLanguage as LyricProject["transcriptionLanguage"],
    workflowStep: project.workflowStep as LyricProject["workflowStep"],
    transcriptionStatus:
      project.transcriptionStatus as LyricProject["transcriptionStatus"],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
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
  };
}

async function resolveReleaseId(releaseId: string | null) {
  if (!releaseId) {
    return null;
  }

  const release = await prisma.release.findUnique({
    where: {
      id: releaseId
    },
    select: {
      id: true
    }
  });

  return release?.id ?? null;
}

async function replaceProjectLines(tx: Prisma.TransactionClient, project: LyricProject) {
  await tx.lyricLine.deleteMany({
    where: {
      projectId: project.id
    }
  });

  if (project.lines.length > 0) {
    await tx.lyricLine.createMany({
      data: project.lines.map((line, index) => ({
        id: line.id,
        projectId: project.id,
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs,
        sortOrder: index
      }))
    });
  }
}

export async function projectExists(projectId: string) {
  const project = await prisma.lyricProject.findUnique({
    where: {
      id: projectId
    },
    select: {
      id: true
    }
  });

  return Boolean(project);
}

export async function readProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await prisma.lyricProject.findMany({
    include: projectInclude,
    orderBy: {
      updatedAt: "desc"
    }
  });

  return projects.map((project: ProjectWithLines) => summarizeProject(toProjectRecord(project)));
}

export async function readProjectsByReleaseId(releaseId: string): Promise<ProjectSummary[]> {
  const projects = await prisma.lyricProject.findMany({
    where: {
      releaseId
    },
    include: projectInclude,
    orderBy: {
      updatedAt: "desc"
    }
  });

  return projects.map((project: ProjectWithLines) => summarizeProject(toProjectRecord(project)));
}

export async function readProject(projectId: string): Promise<LyricProject> {
  const project = await prisma.lyricProject.findUnique({
    where: {
      id: projectId
    },
    include: projectInclude
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  return toProjectRecord(project);
}

export async function saveProject(project: LyricProject) {
  const normalizedProject = hydrateProject(project);
  const releaseId = await resolveReleaseId(normalizedProject.release_id);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.lyricProject.upsert({
      where: {
        id: normalizedProject.id
      },
      create: {
        id: normalizedProject.id,
        title: normalizedProject.title,
        releaseId,
        audioJson: normalizedProject.audio ? serializeJson(normalizedProject.audio) : null,
        backgroundJson: serializeJson(normalizedProject.background),
        lyricsJson: serializeJson(normalizedProject.lyrics),
        animationStyle: normalizedProject.animationStyle,
        aspectRatio: normalizedProject.aspectRatio,
        lyricPlacementJson: serializeJson(normalizedProject.lyricPlacement),
        resolution: normalizedProject.resolution,
        transcriptionLanguage: normalizedProject.transcriptionLanguage,
        workflowStep: normalizedProject.workflowStep,
        transcriptionStatus: normalizedProject.transcriptionStatus,
        createdAt: toDate(normalizedProject.createdAt),
        updatedAt: toDate(normalizedProject.updatedAt)
      },
      update: {
        title: normalizedProject.title,
        releaseId,
        audioJson: normalizedProject.audio ? serializeJson(normalizedProject.audio) : null,
        backgroundJson: serializeJson(normalizedProject.background),
        lyricsJson: serializeJson(normalizedProject.lyrics),
        animationStyle: normalizedProject.animationStyle,
        aspectRatio: normalizedProject.aspectRatio,
        lyricPlacementJson: serializeJson(normalizedProject.lyricPlacement),
        resolution: normalizedProject.resolution,
        transcriptionLanguage: normalizedProject.transcriptionLanguage,
        workflowStep: normalizedProject.workflowStep,
        transcriptionStatus: normalizedProject.transcriptionStatus,
        createdAt: toDate(normalizedProject.createdAt),
        updatedAt: toDate(normalizedProject.updatedAt)
      }
    });

    await replaceProjectLines(tx, normalizedProject);
  });

  return normalizedProject.id;
}

export async function deleteProject(projectId: string) {
  await prisma.lyricProject.delete({
    where: {
      id: projectId
    }
  });
}
