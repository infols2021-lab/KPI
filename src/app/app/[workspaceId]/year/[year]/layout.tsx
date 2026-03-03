import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import YearShell from "./YearShell";

export default async function YearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; year: string }>;
}) {
  const { workspaceId, year } = await params;
  const y = Number(year);

  if (!Number.isFinite(y) || y < 2000 || y > 3000) {
    redirect(`/app/${workspaceId}/years`);
  }

  const supabase = await createSupabaseServerClient();

  // год существует если есть year_settings
  const { data: ys } = await supabase
    .from("workspace_year_settings")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .maybeSingle();

  if (!ys) redirect(`/app/${workspaceId}/years`);

  return (
    <YearShell workspaceId={workspaceId} year={y}>
      {children}
    </YearShell>
  );
}