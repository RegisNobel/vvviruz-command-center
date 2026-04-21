import {redirect} from "next/navigation";

export default async function ReleaseDetailPage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;

  redirect(`/admin/releases/${encodeURIComponent(id)}`);
}
