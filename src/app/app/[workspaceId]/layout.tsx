import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppTopbar from "@/components/AppTopbar";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: ws, error } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .single();

  if (error || !ws) redirect("/app/workspaces");

  return (
    <div className="min-h-screen">
      <AppTopbar title={ws.name} workspaceId={workspaceId} />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}