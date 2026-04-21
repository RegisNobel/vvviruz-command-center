export const dynamic = "force-dynamic";

import {notFound} from "next/navigation";

import {CopyDetailEditor} from "@/components/copy-detail-editor";
import {readCopy} from "@/lib/server/copies";
import {readReleaseSummaries} from "@/lib/server/releases";

export default async function AdminCopyDetailPage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  try {
    const {id} = await params;
    const [copy, releases] = await Promise.all([readCopy(id), readReleaseSummaries()]);

    return <CopyDetailEditor initialCopy={copy} releases={releases} />;
  } catch {
    notFound();
  }
}
