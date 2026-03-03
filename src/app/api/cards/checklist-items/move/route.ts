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
  const itemId = String(body?.itemId ?? "").trim();
  const direction = String(body?.direction ?? "").trim(); // up|down
  if (!itemId || (direction !== "up" && direction !== "down")) return err("itemId + direction(up/down) required", 400);

  const { data: item, error: iErr } = await supabase
    .from("card_checklist_items")
    .select("id, block_id, position")
    .eq("id", itemId)
    .single();

  if (iErr || !item) return err("Item not found", 404);
  if (!item.block_id) return err("Item has no block_id", 400);

  let q = supabase
    .from("card_checklist_items")
    .select("id, position")
    .eq("block_id", item.block_id)
    .neq("id", item.id);

  if (direction === "up") q = q.lt("position", item.position).order("position", { ascending: false }).limit(1);
  else q = q.gt("position", item.position).order("position", { ascending: true }).limit(1);

  const { data: neighbor, error: nErr } = await q;
  if (nErr) return err(nErr.message, 500);

  const nb = neighbor?.[0];
  if (!nb) return NextResponse.json({ ok: true });

  const aPos = Number(item.position);
  const bPos = Number(nb.position);

  const { error: e1 } = await supabase.from("card_checklist_items").update({ position: bPos }).eq("id", item.id);
  if (e1) return err(e1.message, 500);

  const { error: e2 } = await supabase.from("card_checklist_items").update({ position: aPos }).eq("id", nb.id);
  if (e2) return err(e2.message, 500);

  return NextResponse.json({ ok: true, swappedWith: nb.id });
}