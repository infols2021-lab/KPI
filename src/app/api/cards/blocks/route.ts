import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = String(searchParams.get("cardId") ?? "").trim();
    if (!cardId) return err("cardId required", 400);

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return err("Unauthorized", 401);

    const { data, error } = await supabase
      .from("card_blocks")
      .select("id, workspace_id, card_id, type, position, payload, created_at, updated_at")
      .eq("card_id", cardId)
      .order("position", { ascending: true });

    if (error) return err(error.message, 500);
    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return err(e?.message ?? "Server error", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return err("Unauthorized", 401);

    const body = await req.json().catch(() => null);

    const workspaceId = String(body?.workspaceId ?? "").trim();
    const cardId = String(body?.cardId ?? "").trim();
    const type = String(body?.type ?? "").trim();
    const payload = (body?.payload ?? {}) as any;

    if (!workspaceId || !cardId) return err("workspaceId/cardId required", 400);
    if (!["text", "checklist", "link", "attachment"].includes(type)) return err("Bad type", 400);

    const { data: last, error: lastErr } = await supabase
      .from("card_blocks")
      .select("position")
      .eq("card_id", cardId)
      .order("position", { ascending: false })
      .limit(1);

    if (lastErr) return err(lastErr.message, 500);
    const position = (last?.[0]?.position ?? 0) + 1;

    const { data, error } = await supabase
      .from("card_blocks")
      .insert({ workspace_id: workspaceId, card_id: cardId, type, position, payload })
      .select("id, workspace_id, card_id, type, position, payload, created_at, updated_at")
      .single();

    if (error) return err(error.message, 500);
    return NextResponse.json({ data });
  } catch (e: any) {
    return err(e?.message ?? "Server error", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return err("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    if (!id) return err("id required", 400);

    const patch: any = {};
    if (body.payload != null) patch.payload = body.payload;
    if (body.position != null) patch.position = Number(body.position);

    const { error } = await supabase.from("card_blocks").update(patch).eq("id", id);
    if (error) return err(error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return err(e?.message ?? "Server error", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    if (!id) return err("id required", 400);

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return err("Unauthorized", 401);

    const { error } = await supabase.from("card_blocks").delete().eq("id", id);
    if (error) return err(error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return err(e?.message ?? "Server error", 500);
  }
}