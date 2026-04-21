export const dynamic = "force-dynamic";

import {ReleasesPageContent} from "@/components/releases-page-content";
import {readReleaseSummaries} from "@/lib/server/releases";

export default async function AdminReleasesPage() {
  const releases = await readReleaseSummaries();

  return <ReleasesPageContent releases={releases} />;
}

