import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return err("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const blockId = String(body?.blockId ?? "").trim();
  const text = String(body?.text ?? "").trim();
  if (!blockId || !text) return err("blockId/text required", 400);

  const { data: block, error: bErr } = await supabase
    .from("card_blocks")
    .select("id, workspace_id, card_id, type")
    .eq("id", blockId)
    .single();

  if (bErr || !block) return err("Block not found", 404);
  if (block.type !== "checklist") return err("Block is not checklist", 400);

  const { data: last, error: lastErr } = await supabase
    .from("card_checklist_items")
    .select("position")
    .eq("block_id", blockId)
    .order("position", { ascending: false })
    .limit(1);

  if (lastErr) return err(lastErr.message, 500);
  const position = (last?.[0]?.position ?? 0) + 1;

  const { data, error } = await supabase
    .from("card_checklist_items")
    .insert({
      workspace_id: block.workspace_id,
      card_id: block.card_id,
      block_id: blockId,
      text,
      is_done: false,
      position,
    })
    .select("id, block_id, text, is_done, position, created_at, updated_at")
    .single();

  if (error) return err(error.message, 500);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return err("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  if (!id) return err("id required", 400);

  const patch: any = {};
  if (body.text != null) patch.text = String(body.text);
  if (body.is_done != null) patch.is_done = Boolean(body.is_done);
  if (body.position != null) patch.position = Number(body.position);

  const { error } = await supabase.from("card_checklist_items").update(patch).eq("id", id);
  if (error) return err(error.message, 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return err("id required", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return err("Unauthorized", 401);

  const { error } = await supabase.from("card_checklist_items").delete().eq("id", id);
  if (error) return err(error.message, 500);

  return NextResponse.json({ ok: true });
}