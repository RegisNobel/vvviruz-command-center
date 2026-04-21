import type {CopyRecord, CopySummary, CopyType} from "@/lib/types";
import {createId} from "@/lib/utils";

export const copyTypeOptions = [
  "curiosity",
  "contrarian-opinion",
  "relatable-pain",
  "listicle-numbered",
  "direct-actionable",
  "mistake-regret",
  "before-after-result",
  "neutral"
] as const satisfies ReadonlyArray<CopyType>;

type LegacyCopyShape = Partial<CopyRecord> & {
  releaseId?: string | null;
};

export function normalizeCopyType(value: string | undefined): CopyType {
  if (!value) {
    return "neutral";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (copyTypeOptions.includes(normalizedValue as CopyType)) {
    return normalizedValue as CopyType;
  }

  switch (normalizedValue) {
    case "relatable":
    case "emotional":
      return "relatable-pain";
    case "negative":
    case "ragebait":
      return "contrarian-opinion";
    case "clickbait":
      return "curiosity";
    case "storytelling":
    case "aspirational":
      return "before-after-result";
    default:
      return "neutral";
  }
}

export function formatCopyType(value: CopyType) {
  switch (value) {
    case "curiosity":
      return "Curiosity";
    case "contrarian-opinion":
      return "Contrarian/Opinion";
    case "relatable-pain":
      return "Relatable/Pain";
    case "listicle-numbered":
      return "Listicle/Numbered";
    case "direct-actionable":
      return "Direct/Actionable";
    case "mistake-regret":
      return "Mistake/Regret";
    case "before-after-result":
      return 'The "Before/After" or "Result"';
    case "neutral":
      return "Neutral";
    default:
      return "Neutral";
  }
}

export function getCopyHeading(copy: Pick<CopyRecord, "hook">) {
  const normalizedHook = copy.hook.trim();

  return normalizedHook || "Untitled Copy";
}

export function createEmptyCopy(
  values?: Partial<Pick<CopyRecord, "hook" | "caption" | "type" | "release_id">>
): CopyRecord {
  const now = new Date().toISOString();

  return {
    id: createId(),
    release_id: values?.release_id ?? null,
    hook: values?.hook?.trim() || "",
    caption: values?.caption?.trim() || "",
    type: normalizeCopyType(values?.type),
    created_on: now,
    updated_on: now
  };
}

export function hydrateCopy(input: LegacyCopyShape): CopyRecord {
  const fallback = createEmptyCopy();
  const releaseId =
    typeof input.release_id === "string"
      ? input.release_id
      : typeof input.releaseId === "string"
        ? input.releaseId
        : null;

  return {
    ...fallback,
    ...input,
    id: input.id?.trim() || fallback.id,
    release_id: releaseId,
    hook: input.hook?.trim() || "",
    caption: input.caption?.trim() || "",
    type: normalizeCopyType(input.type),
    created_on: input.created_on ?? fallback.created_on,
    updated_on: input.updated_on ?? fallback.updated_on
  };
}

export function touchCopy(copy: CopyRecord): CopyRecord {
  return {
    ...copy,
    updated_on: new Date().toISOString()
  };
}

export function summarizeCopy(copy: CopyRecord): CopySummary {
  const normalizedCopy = hydrateCopy(copy);

  return {
    id: normalizedCopy.id,
    release_id: normalizedCopy.release_id,
    hook: normalizedCopy.hook,
    caption: normalizedCopy.caption,
    type: normalizedCopy.type,
    created_on: normalizedCopy.created_on,
    updated_on: normalizedCopy.updated_on
  };
}
