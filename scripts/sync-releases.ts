import fs from "node:fs/promises";
import path from "node:path";

import {createEmptyRelease} from "../lib/releases";
import {saveRelease} from "../lib/repositories/releases";
import {readReleaseSummaries, readRelease} from "../lib/server/releases";
import type {ReleaseRecord} from "../lib/types";

const releasesDir = path.join(process.cwd(), "storage", "releases");
const catalogPath = path.join(releasesDir, "vvviruz_100_song_catalog.txt");
const songIndexPath = path.join(releasesDir, "vvviruz_song_index.txt");

type SyncResult = {
  created: number;
  duplicatesSkipped: number;
  conceptsUpdated: number;
  conceptsSkipped: number;
};

function sanitizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fixPotentialMojibake(value: string) {
  const trimmed = value.trim();

  if (!trimmed || !/[ÃÂâ]/.test(trimmed)) {
    return trimmed;
  }

  try {
    const repaired = Buffer.from(trimmed, "latin1").toString("utf8").trim();

    if (repaired) {
      return repaired;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function normalizeTitle(value: string) {
  let normalized = fixPotentialMojibake(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  normalized = normalized
    .replace(/\bsakmoto\b/g, "sakamoto")
    .replace(/\bcoivd\b/g, "covid")
    .replace(/&/g, " and ");

  const romanNumerals = [
    ["viii", "8"],
    ["vii", "7"],
    ["vi", "6"],
    ["iv", "4"],
    ["iii", "3"],
    ["ii", "2"],
    ["ix", "9"],
    ["v", "5"],
    ["i", "1"]
  ] as const;

  for (const [roman, number] of romanNumerals) {
    normalized = normalized.replace(new RegExp(`\\b${roman}\\b`, "g"), number);
  }

  normalized = normalized
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|vs|versus|and|feat|ft)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function createSortedLookupKey(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .join(" ");
}

function addLookupVariant(keys: Set<string>, value: string) {
  const normalized = normalizeTitle(value);

  if (!normalized) {
    return;
  }

  keys.add(normalized);

  const sortedKey = createSortedLookupKey(normalized);

  if (sortedKey) {
    keys.add(sortedKey);
  }
}

function buildLookupKeys(title: string) {
  const cleanedTitle = sanitizeWhitespace(fixPotentialMojibake(title));
  const keys = new Set<string>();

  addLookupVariant(keys, cleanedTitle);

  const withoutMultiversusPrefix = cleanedTitle.replace(
    /^multiversus\s+[a-z0-9ivx]+\s*[:\-)]?\s*/i,
    ""
  );

  if (withoutMultiversusPrefix !== cleanedTitle) {
    addLookupVariant(keys, withoutMultiversusPrefix);
  }

  const colonSections = cleanedTitle
    .split(":")
    .map((section) => sanitizeWhitespace(section))
    .filter(Boolean);

  if (colonSections.length > 1) {
    addLookupVariant(keys, colonSections[0]);
    addLookupVariant(keys, colonSections.slice(1).join(" "));
  }

  const parentheticalMatch = cleanedTitle.match(/^(.*?)\((.*?)\)\s*$/);

  if (parentheticalMatch) {
    const before = sanitizeWhitespace(parentheticalMatch[1] ?? "");
    const inside = sanitizeWhitespace(parentheticalMatch[2] ?? "");

    addLookupVariant(keys, before);
    addLookupVariant(keys, inside);
    addLookupVariant(keys, `${before} ${inside}`);
  }

  const strippedDescriptorVariant = sanitizeWhitespace(
    cleanedTitle
      .replace(/\b(freestyle|track|rap|mi)\b/gi, " ")
      .replace(/[()]/g, " ")
  );

  if (strippedDescriptorVariant !== cleanedTitle) {
    addLookupVariant(keys, strippedDescriptorVariant);
  }

  const normalizedValue = normalizeTitle(cleanedTitle);

  if (normalizedValue === "switch") {
    addLookupVariant(keys, "Switch 1");
  }

  const switchNumberMatch = normalizedValue.match(/^switch\s+([0-9]+)$/);

  if (switchNumberMatch?.[1] === "1") {
    addLookupVariant(keys, "Switch");
  }

  return keys;
}

function scoreReleaseMatch(release: ReleaseRecord, title: string) {
  const targetNormalizedTitle = normalizeTitle(title);
  const targetSortedTitle = createSortedLookupKey(targetNormalizedTitle);
  const releaseKeys = buildLookupKeys(release.title);
  const inputKeys = buildLookupKeys(title);
  let score = 0;

  if (releaseKeys.has(targetNormalizedTitle)) {
    score += 10;
  }

  if (targetSortedTitle && releaseKeys.has(targetSortedTitle)) {
    score += 8;
  }

  for (const key of inputKeys) {
    if (releaseKeys.has(key)) {
      score += 2;
    }
  }

  return score;
}

function findMatchingRelease(releases: ReleaseRecord[], title: string) {
  let bestMatch: ReleaseRecord | null = null;
  let bestScore = 0;

  for (const release of releases) {
    const score = scoreReleaseMatch(release, title);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = release;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

function shouldReplaceConcept(existingConcept: string, nextConcept: string) {
  const current = existingConcept.trim();
  const incoming = nextConcept.trim();

  if (!incoming) {
    return false;
  }

  if (!current) {
    return true;
  }

  if (current.toLowerCase() === "a track about mahoraga") {
    return true;
  }

  return current.length < 40 && incoming.length > current.length;
}

function parseCatalogTitles(rawCatalog: string) {
  const normalizedCatalog = fixPotentialMojibake(rawCatalog);
  const seenTitles = new Set<string>();
  const titles: string[] = [];

  for (const line of normalizedCatalog.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+\.\s+(.+?)\s*$/);

    if (!match?.[1]) {
      continue;
    }

    const title = sanitizeWhitespace(fixPotentialMojibake(match[1]));
    const dedupeKey = normalizeTitle(title);

    if (!dedupeKey || seenTitles.has(dedupeKey)) {
      continue;
    }

    seenTitles.add(dedupeKey);
    titles.push(title);
  }

  return titles;
}

function parseSongConcepts(rawSongIndex: string) {
  const normalizedSongIndex = fixPotentialMojibake(rawSongIndex);
  const lines = normalizedSongIndex.split(/\r?\n/);
  const concepts = new Map<string, string>();
  let currentTitle = "";
  let currentConceptLines: string[] = [];
  let isReadingConcept = false;

  const flushEntry = () => {
    const concept = currentConceptLines.join("\n").trim();

    if (currentTitle && concept) {
      concepts.set(currentTitle, concept);
    }

    currentTitle = "";
    currentConceptLines = [];
    isReadingConcept = false;
  };

  for (const rawLine of lines) {
    const line = fixPotentialMojibake(rawLine).trim();
    const headingMatch = line.match(/^(\d+)\.\s+(.+?)\s*$/);

    if (headingMatch?.[2]) {
      flushEntry();
      currentTitle = sanitizeWhitespace(headingMatch[2]);
      continue;
    }

    if (!currentTitle) {
      continue;
    }

    if (line.startsWith("Concept:")) {
      isReadingConcept = true;
      currentConceptLines = [line.replace(/^Concept:\s*/, "").trim()];
      continue;
    }

    if (
      isReadingConcept &&
      /^(Lyrics:|Hook:|Hook idea:|Notable lyric:)/i.test(line)
    ) {
      isReadingConcept = false;
      continue;
    }

    if (isReadingConcept && line) {
      currentConceptLines.push(line);
    }
  }

  flushEntry();

  return concepts;
}

async function readExistingReleases() {
  const summaries = await readReleaseSummaries();

  return Promise.all(summaries.map((summary) => readRelease(summary.id)));
}

async function syncReleaseCatalog(): Promise<SyncResult> {
  const [catalogRaw, songIndexRaw, existingReleases] = await Promise.all([
    fs.readFile(catalogPath, "utf8"),
    fs.readFile(songIndexPath, "utf8"),
    readExistingReleases()
  ]);
  const catalogTitles = parseCatalogTitles(catalogRaw);
  const songConcepts = parseSongConcepts(songIndexRaw);
  const releases = [...existingReleases];
  let created = 0;
  let duplicatesSkipped = 0;
  let conceptsUpdated = 0;
  let conceptsSkipped = 0;

  for (const catalogTitle of catalogTitles) {
    const match = findMatchingRelease(releases, catalogTitle);

    if (match) {
      duplicatesSkipped += 1;
      continue;
    }

    const nextRelease = createEmptyRelease({title: catalogTitle});

    await saveRelease(nextRelease);
    releases.push(nextRelease);
    created += 1;
  }

  for (const [songTitle, concept] of songConcepts.entries()) {
    const matchedRelease = findMatchingRelease(releases, songTitle);

    if (!matchedRelease || !shouldReplaceConcept(matchedRelease.concept_details, concept)) {
      conceptsSkipped += 1;
      continue;
    }

    const updatedRelease: ReleaseRecord = {
      ...matchedRelease,
      concept_details: concept,
      updated_on: new Date().toISOString()
    };

    await saveRelease(updatedRelease);

    const releaseIndex = releases.findIndex((release) => release.id === updatedRelease.id);

    if (releaseIndex >= 0) {
      releases[releaseIndex] = updatedRelease;
    }

    conceptsUpdated += 1;
  }

  return {
    created,
    duplicatesSkipped,
    conceptsUpdated,
    conceptsSkipped
  };
}

async function main() {
  const result = await syncReleaseCatalog();

  console.log(
    JSON.stringify(
      {
        message: "Release catalog sync complete.",
        ...result
      },
      null,
      2
    )
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Release sync failed.");
  process.exitCode = 1;
});
