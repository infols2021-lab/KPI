import ProjectsClient from "./ui";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; year: string }>;
}) {
  const { workspaceId, year } = await params;
  return <ProjectsClient workspaceId={workspaceId} year={Number(year)} />;
}