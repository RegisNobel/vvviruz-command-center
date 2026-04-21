export const dynamic = "force-dynamic";

import {notFound} from "next/navigation";

import {ReleaseDetailEditor} from "@/components/release-detail-editor";
import {readCopiesByReleaseId} from "@/lib/server/copies";
import {readRelease} from "@/lib/server/releases";
import {readProjectsByReleaseId} from "@/lib/server/storage";

export default async function AdminReleaseDetailPage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  try {
    const {id} = await params;
    const [release, linkedProjects, linkedCopies] = await Promise.all([
      readRelease(id),
      readProjectsByReleaseId(id),
      readCopiesByReleaseId(id)
    ]);

    return (
      <ReleaseDetailEditor
        initialLinkedCopies={linkedCopies}
        initialLinkedProjects={linkedProjects}
        initialRelease={release}
      />
    );
  } catch {
    notFound();
  }
}

