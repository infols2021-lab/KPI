import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = String(searchParams.get("workspaceId") ?? "").trim();
  const year = Number(searchParams.get("year"));

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("workspace_id", workspaceId)
    .eq("year", year)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? "").trim();
  const year = Number(body?.year);
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      year,
      name,
      description: description || null,
      created_by: userData.user.id,
    })
    .select("id, name, description, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const workspaceId = String(body?.workspaceId ?? "").trim();
  const year = Number(body?.year);

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });

  const patch: any = {};
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.description != null) patch.description = String(body.description).trim() || null;

  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("year", year);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  const workspaceId = String(searchParams.get("workspaceId") ?? "").trim();
  const year = Number(searchParams.get("year"));

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("year", year);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}