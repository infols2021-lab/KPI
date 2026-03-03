import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  if (!isUuid(token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const { data, error } = await supabase.rpc("accept_workspace_invite", { p_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { workspaceId: data } });
}