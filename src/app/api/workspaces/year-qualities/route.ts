// src/app/api/workspaces/year-qualities/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jerr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseDecimalAny(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim().replace(",", ".");
    if (!s) return null;
    const normalized = s.startsWith(".") ? `0${s}` : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jerr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? "");
  const year = Number(body?.year);
  const code = String(body?.code ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const coef = parseDecimalAny(body?.coef);

  if (!workspaceId || !Number.isFinite(year) || !code || !title || coef == null) {
    return jerr("Bad params", 400);
  }

  const { data, error } = await supabase
    .from("workspace_year_quality_levels")
    .insert({ workspace_id: workspaceId, year, code, title, coef })
    .select("id, code, title, coef")
    .single();

  if (error) return jerr(error.message, 500);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jerr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return jerr("id required", 400);

  const patch: any = {};
  if (body.code !== undefined) patch.code = String(body.code ?? "");
  if (body.title !== undefined) patch.title = String(body.title ?? "");
  if (body.coef !== undefined) {
    const n = parseDecimalAny(body.coef);
    if (n == null) return jerr("coef must be a number", 400);
    patch.coef = n;
  }

  const { error } = await supabase.from("workspace_year_quality_levels").update(patch).eq("id", id);
  if (error) return jerr(error.message, 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "");
  if (!id) return jerr("id required", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jerr("Unauthorized", 401);

  const { error } = await supabase.from("workspace_year_quality_levels").delete().eq("id", id);
  if (error) return jerr(error.message, 500);

  return NextResponse.json({ ok: true });
}