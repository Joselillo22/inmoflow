import { redirect } from "next/navigation";

export default async function InmuebleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inmuebles?open=${id}`);
}
