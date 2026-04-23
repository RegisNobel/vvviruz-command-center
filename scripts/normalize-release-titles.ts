import {hydrateRelease} from "../lib/releases";
import {saveRelease} from "../lib/repositories/releases";
import {readReleaseSummaries, readRelease} from "../lib/server/releases";
import type {ReleaseRecord} from "../lib/types";

const explicitTitleMap = new Map<string, string>([
  ["Multiversus 1: king", "Multiversus: King - Meruem vs. Beru"],
  ["Multiversus 2: bloody", "Multiversus: Bloody - Alucard vs. Muzan"],
  ["Multiversus 3 (HIT: John Wick vs Sakmoto)", "Multiversus: HIT - John Wick vs. Sakamoto"],
  ["Multiversus: Arcana ? Gandalf vs. Merlin", "Multiversus: Arcana - Gandalf vs. Merlin"],
  ["Multiversus: Blade Dance ? Zoro vs. Zorro", "Multiversus: Blade Dance - Zoro vs. Zorro"],
  [
    "Multiversus: Brotherhood ? Sam & Dean vs. The Mikaelsons",
    "Multiversus: Brotherhood - Sam & Dean vs. The Mikaelsons"
  ],
  [
    "Multiversus: Conquerors' Creed ? Zod vs. Conquest",
    "Multiversus: Conquerors' Creed - Zod vs. Conquest"
  ],
  [
    "Multiversus: Dominion ? Omni-Man vs. Homelander",
    "Multiversus: Dominion - Omni-Man vs. Homelander"
  ],
  [
    "Multiversus: Edge of Reality ? Sunraku vs. Kirito",
    "Multiversus: Edge of Reality - Sunraku vs. Kirito"
  ],
  [
    "Multiversus: Flashpoint ? Yellow Flash vs. Flash",
    "Multiversus: Flashpoint - Yellow Flash vs. Flash"
  ],
  [
    "Multiversus: In the Shadows ? Mahoraga vs. Bellion",
    "Multiversus: In the Shadows - Mahoraga vs. Bellion"
  ],
  [
    "Multiversus: Overpowered ? Rimuru vs. Cid",
    "Multiversus: Overpowered - Rimuru vs. Cid"
  ],
  [
    "Multiversus: Playtime?s Over ? Chucky vs. M3GAN",
    "Multiversus: Playtime's Over - Chucky vs. M3GAN"
  ],
  [
    "Multiversus: Sleep No More ? Freddy vs. Jason",
    "Multiversus: Sleep No More - Freddy vs. Jason"
  ],
  [
    "Multiversus: The Wailing ? La Llorona vs. Sadako",
    "Multiversus: The Wailing - La Llorona vs. Sadako"
  ],
  ["Multiversus: Waifu ? Katara vs. Hinata", "Multiversus: Waifu - Katara vs. Hinata"]
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeVsSegment(value: string) {
  return normalizeWhitespace(value).replace(/\bvs\.?\b/gi, "vs.");
}

function normalizeTitle(title: string) {
  if (explicitTitleMap.has(title)) {
    return explicitTitleMap.get(title) ?? title;
  }

  const parentheticalMatch = title.match(/^(.*?)\((.*?\bvs\.?\b.*?)\)\s*$/i);

  if (parentheticalMatch) {
    const label = normalizeWhitespace(parentheticalMatch[1] ?? "");
    const matchup = normalizeVsSegment(parentheticalMatch[2] ?? "");

    return `Multiversus: ${label} - ${matchup}`;
  }

  if (/^multiversus:\s*/i.test(title)) {
    const withoutPrefix = title.replace(/^multiversus:\s*/i, "");
    const normalized = normalizeWhitespace(withoutPrefix).replace(/\s+\?\s+/g, " - ");

    return `Multiversus: ${normalizeVsSegment(normalized)}`;
  }

  if (/\bvs\.?\b/i.test(title)) {
    return `Multiversus: ${normalizeVsSegment(title)}`;
  }

  return title;
}

async function readReleases() {
  const summaries = await readReleaseSummaries();

  return Promise.all(
    summaries.map(async (summary) => ({
      release: hydrateRelease(await readRelease(summary.id))
    }))
  );
}

async function normalizeReleaseTitles() {
  const releases = await readReleases();
  const usedTitles = new Set(releases.map(({release}) => release.title));
  const renamed: Array<{from: string; to: string}> = [];

  for (const entry of releases) {
    const nextTitle = normalizeTitle(entry.release.title);

    if (nextTitle === entry.release.title) {
      continue;
    }

    if (usedTitles.has(nextTitle)) {
      throw new Error(
        `Refusing to rename "${entry.release.title}" to "${nextTitle}" because that title already exists.`
      );
    }

    usedTitles.delete(entry.release.title);
    usedTitles.add(nextTitle);

    const updatedRelease: ReleaseRecord = {
      ...entry.release,
      title: nextTitle,
      updated_on: new Date().toISOString()
    };

    await saveRelease(updatedRelease);

    renamed.push({
      from: entry.release.title,
      to: nextTitle
    });
  }

  return renamed;
}

async function main() {
  const renamed = await normalizeReleaseTitles();

  console.log(
    JSON.stringify(
      {
        message: "Release title normalization complete.",
        renamedCount: renamed.length,
        renamed
      },
      null,
      2
    )
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Release title normalization failed."
  );
  process.exitCode = 1;
});
