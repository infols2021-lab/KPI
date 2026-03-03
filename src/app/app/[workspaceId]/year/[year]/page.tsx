import { redirect } from "next/navigation";

export default async function YearIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string; year: string }>;
}) {
  const { workspaceId, year } = await params;
  redirect(`/app/${workspaceId}/year/${year}/1`);
}