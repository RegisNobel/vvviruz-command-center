import {redirect} from "next/navigation";

export default async function CopyDetailPage({
  params
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;

  redirect(`/admin/copy-lab/${encodeURIComponent(id)}`);
}
