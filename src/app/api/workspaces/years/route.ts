import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = String(searchParams.get("workspaceId") ?? "");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workspace_year_settings")
    .select("year")
    .eq("workspace_id", workspaceId)
    .order("year", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}