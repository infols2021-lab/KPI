import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, joined_at, workspaces:workspaces(id, name, description, owner_user_id, created_at)")
    .eq("user_id", userData.user.id)
    .order("joined_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((row: any) => ({
    role: row.role,
    joined_at: row.joined_at,
    workspace: row.workspaces,
  }));

  return NextResponse.json({ data: items });
}