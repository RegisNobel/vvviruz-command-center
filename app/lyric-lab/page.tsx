import {redirect} from "next/navigation";

export default async function LyricLabPage({
  searchParams
}: {
  searchParams: Promise<{projectId?: string; releaseId?: string}>;
}) {
  const {projectId, releaseId} = await searchParams;
  const query = new URLSearchParams();

  if (projectId) {
    query.set("projectId", projectId);
  }

  if (releaseId) {
    query.set("releaseId", releaseId);
  }

  redirect(`/admin/lyric-lab${query.size ? `?${query.toString()}` : ""}`);
}
