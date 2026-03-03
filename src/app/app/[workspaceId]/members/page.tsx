import MembersClient from "./ui";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <MembersClient workspaceId={workspaceId} />;
}