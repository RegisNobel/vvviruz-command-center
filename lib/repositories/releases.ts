import type {Prisma} from "@prisma/client";

import {prisma} from "@/lib/db/prisma";
import {toDate} from "@/lib/db/serialization";
import {hydrateRelease, summarizeRelease} from "@/lib/releases";
import type {
  ReleaseRecord,
  ReleaseStreamingLinks,
  ReleaseSummary,
  ReleaseTask
} from "@/lib/types";
import {createId, slugify} from "@/lib/utils";

const releaseInclude = {
  tasks: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  streamingLinks: true
} satisfies Prisma.ReleaseInclude;

type ReleaseWithRelations = Prisma.ReleaseGetPayload<{
  include: typeof releaseInclude;
}>;

function mapStreamingLinks(
  links: Array<{
    platform: string;
    url: string;
  }>
): ReleaseStreamingLinks {
  const streamingLinks: ReleaseStreamingLinks = {
    spotify: "",
    apple_music: "",
    youtube: ""
  };

  for (const link of links) {
    if (link.platform === "spotify") {
      streamingLinks.spotify = link.url;
      continue;
    }

    if (link.platform === "apple_music") {
      streamingLinks.apple_music = link.url;
      continue;
    }

    if (link.platform === "youtube") {
      streamingLinks.youtube = link.url;
    }
  }

  return streamingLinks;
}

function createPublicCoverPath(
  release: Pick<ReleaseWithRelations, "coverArtUrl"> & {
    coverArtUrl?: string | null;
  }
) {
  return release.coverArtUrl?.trim() || "";
}

async function createUniqueReleaseSlug(baseValue: string, releaseId: string) {
  const normalizedBase = slugify(baseValue) || `release-${releaseId.slice(0, 8)}`;
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const existing = await prisma.release.findFirst({
      where: {
        slug: candidate,
        NOT: {
          id: releaseId
        }
      },
      select: {
        id: true
      }
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
}

function mapReleaseTasks(tasks: Array<{id: string; text: string; completed: boolean}>): ReleaseTask[] {
  return tasks.map((task) => ({
    id: task.id,
    text: task.text,
    completed: task.completed
  }));
}

function toReleaseRecord(release: ReleaseWithRelations): ReleaseRecord {
  return hydrateRelease({
    id: release.id,
    title: release.title,
    pinned: release.pinned,
    collaborator: release.collaborator,
    collaborator_name: release.collaboratorName,
    upc: release.upc,
    isrc: release.isrc,
    cover_art:
      release.coverArtId && release.coverArtFileName && release.coverArtUrl
        ? {
            id: release.coverArtId,
            fileName: release.coverArtFileName,
            url: release.coverArtUrl,
            mimeType: release.coverArtMimeType || "image/*"
          }
        : null,
    cover_art_path: release.coverArtPath || createPublicCoverPath(release),
    streaming_links: mapStreamingLinks(release.streamingLinks),
    lyrics: release.lyrics,
    type: release.type as ReleaseRecord["type"],
    release_date: release.releaseDate,
    concept_details: release.conceptDetails,
    public_description: release.publicDescription || release.conceptDetails,
    public_long_description: release.publicLongDescription,
    featured_video_url: release.featuredVideoUrl,
    public_lyrics_enabled: release.publicLyricsEnabled,
    is_published: release.isPublished,
    is_featured: release.isFeatured,
    concept_complete: release.conceptComplete,
    beat_made: release.beatMade,
    lyrics_finished: release.lyricsFinished,
    recorded: release.recorded,
    mix_mastered: release.mixMastered,
    published: release.published,
    tasks: mapReleaseTasks(release.tasks),
    created_on: release.createdOn.toISOString(),
    updated_on: release.updatedOn.toISOString()
  });
}

async function replaceReleaseRelations(tx: Prisma.TransactionClient, release: ReleaseRecord) {
  await tx.releaseTask.deleteMany({
    where: {
      releaseId: release.id
    }
  });

  if (release.tasks.length > 0) {
    const now = toDate(release.updated_on);

    await tx.releaseTask.createMany({
      data: release.tasks.map((task, index) => ({
        id: task.id || createId(),
        releaseId: release.id,
        text: task.text,
        completed: task.completed,
        sortOrder: index,
        createdAt: now,
        updatedAt: now
      }))
    });
  }

  await tx.releaseStreamingLink.deleteMany({
    where: {
      releaseId: release.id
    }
  });

  const streamingLinks = [
    ["spotify", release.streaming_links.spotify],
    ["apple_music", release.streaming_links.apple_music],
    ["youtube", release.streaming_links.youtube]
  ].filter(([, url]) => url.trim()) as Array<[string, string]>;

  if (streamingLinks.length > 0) {
    const now = toDate(release.updated_on);

    await tx.releaseStreamingLink.createMany({
      data: streamingLinks.map(([platform, url]) => ({
        id: createId(),
        releaseId: release.id,
        platform,
        url,
        createdAt: now,
        updatedAt: now
      }))
    });
  }
}

export async function releaseExists(releaseId: string) {
  const release = await prisma.release.findUnique({
    where: {
      id: releaseId
    },
    select: {
      id: true
    }
  });

  return Boolean(release);
}

export async function readReleaseSummaries(): Promise<ReleaseSummary[]> {
  const releases = await prisma.release.findMany({
    include: releaseInclude,
    orderBy: [
      {
        pinned: "desc"
      },
      {
        updatedOn: "desc"
      }
    ]
  });

  return releases.map((release: ReleaseWithRelations) =>
    summarizeRelease(toReleaseRecord(release))
  );
}

export async function readRelease(releaseId: string): Promise<ReleaseRecord> {
  const release = await prisma.release.findUnique({
    where: {
      id: releaseId
    },
    include: releaseInclude
  });

  if (!release) {
    throw new Error("Release not found.");
  }

  return toReleaseRecord(release);
}

export async function saveRelease(release: ReleaseRecord) {
  const normalizedRelease = hydrateRelease(release);
  const slug = await createUniqueReleaseSlug(
    normalizedRelease.slug || normalizedRelease.title,
    normalizedRelease.id
  );
  const coverArtPath =
    normalizedRelease.cover_art_path.trim() ||
    normalizedRelease.cover_art?.url?.trim() ||
    "";

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.release.upsert({
      where: {
        id: normalizedRelease.id
      },
      create: {
        id: normalizedRelease.id,
        title: normalizedRelease.title,
        slug,
        pinned: normalizedRelease.pinned,
        collaborator: normalizedRelease.collaborator,
        collaboratorName: normalizedRelease.collaborator_name,
        upc: normalizedRelease.upc,
        isrc: normalizedRelease.isrc,
        coverArtId: normalizedRelease.cover_art?.id ?? null,
        coverArtFileName: normalizedRelease.cover_art?.fileName ?? null,
        coverArtUrl: normalizedRelease.cover_art?.url ?? null,
        coverArtPath,
        coverArtMimeType: normalizedRelease.cover_art?.mimeType ?? null,
        lyrics: normalizedRelease.lyrics,
        type: normalizedRelease.type,
        releaseDate: normalizedRelease.release_date,
        conceptDetails: normalizedRelease.concept_details,
        publicDescription: normalizedRelease.public_description,
        publicLongDescription: normalizedRelease.public_long_description,
        spotifyUrl: normalizedRelease.streaming_links.spotify,
        appleMusicUrl: normalizedRelease.streaming_links.apple_music,
        youtubeUrl: normalizedRelease.streaming_links.youtube,
        isPublished: normalizedRelease.is_published,
        isFeatured: normalizedRelease.is_featured,
        featuredVideoUrl: normalizedRelease.featured_video_url,
        publicLyricsEnabled: normalizedRelease.public_lyrics_enabled,
        conceptComplete: normalizedRelease.concept_complete,
        beatMade: normalizedRelease.beat_made,
        lyricsFinished: normalizedRelease.lyrics_finished,
        recorded: normalizedRelease.recorded,
        mixMastered: normalizedRelease.mix_mastered,
        published: normalizedRelease.published,
        createdOn: toDate(normalizedRelease.created_on),
        updatedOn: toDate(normalizedRelease.updated_on)
      },
      update: {
        title: normalizedRelease.title,
        slug,
        pinned: normalizedRelease.pinned,
        collaborator: normalizedRelease.collaborator,
        collaboratorName: normalizedRelease.collaborator_name,
        upc: normalizedRelease.upc,
        isrc: normalizedRelease.isrc,
        coverArtId: normalizedRelease.cover_art?.id ?? null,
        coverArtFileName: normalizedRelease.cover_art?.fileName ?? null,
        coverArtUrl: normalizedRelease.cover_art?.url ?? null,
        coverArtPath,
        coverArtMimeType: normalizedRelease.cover_art?.mimeType ?? null,
        lyrics: normalizedRelease.lyrics,
        type: normalizedRelease.type,
        releaseDate: normalizedRelease.release_date,
        conceptDetails: normalizedRelease.concept_details,
        publicDescription: normalizedRelease.public_description,
        publicLongDescription: normalizedRelease.public_long_description,
        spotifyUrl: normalizedRelease.streaming_links.spotify,
        appleMusicUrl: normalizedRelease.streaming_links.apple_music,
        youtubeUrl: normalizedRelease.streaming_links.youtube,
        isPublished: normalizedRelease.is_published,
        isFeatured: normalizedRelease.is_featured,
        featuredVideoUrl: normalizedRelease.featured_video_url,
        publicLyricsEnabled: normalizedRelease.public_lyrics_enabled,
        conceptComplete: normalizedRelease.concept_complete,
        beatMade: normalizedRelease.beat_made,
        lyricsFinished: normalizedRelease.lyrics_finished,
        recorded: normalizedRelease.recorded,
        mixMastered: normalizedRelease.mix_mastered,
        published: normalizedRelease.published,
        createdOn: toDate(normalizedRelease.created_on),
        updatedOn: toDate(normalizedRelease.updated_on)
      }
    });

    await replaceReleaseRelations(tx, normalizedRelease);
  });

  return normalizedRelease.id;
}

export async function deleteRelease(releaseId: string) {
  await prisma.release.delete({
    where: {
      id: releaseId
    }
  });
}
