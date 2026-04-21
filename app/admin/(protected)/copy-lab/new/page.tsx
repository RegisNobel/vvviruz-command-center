import {CopyCreateForm} from "@/components/copy-create-form";
import {readReleaseSummaries} from "@/lib/server/releases";

export default async function AdminNewCopyPage({
  searchParams
}: {
  searchParams: Promise<{releaseId?: string}>;
}) {
  const [{releaseId}, releases] = await Promise.all([searchParams, readReleaseSummaries()]);
  const initialReleaseId =
    releases.some((release) => release.id === releaseId) && releaseId ? releaseId : null;

  return <CopyCreateForm initialReleaseId={initialReleaseId} releases={releases} />;
}

