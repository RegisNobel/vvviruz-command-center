import {redirect} from "next/navigation";

export default async function NewCopyPage({
  searchParams
}: {
  searchParams: Promise<{releaseId?: string}>;
}) {
  const {releaseId} = await searchParams;
  const query = releaseId ? `?releaseId=${encodeURIComponent(releaseId)}` : "";

  redirect(`/admin/copy-lab/new${query}`);
}
