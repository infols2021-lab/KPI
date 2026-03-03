import YearsClient from "./ui";

export default async function YearsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <YearsClient workspaceId={workspaceId} />;
}