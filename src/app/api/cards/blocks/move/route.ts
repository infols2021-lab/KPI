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
  const direction = String(body?.direction ?? "").trim(); // up|down

  if (!blockId || (direction !== "up" && direction !== "down")) {
    return err("blockId + direction(up/down) required", 400);
  }

  const { data: block, error: bErr } = await supabase
    .from("card_blocks")
    .select("id, card_id, position")
    .eq("id", blockId)
    .single();

  if (bErr || !block) return err("Block not found", 404);

  let q = supabase
    .from("card_blocks")
    .select("id, position")
    .eq("card_id", block.card_id)
    .neq("id", block.id);

  if (direction === "up") {
    q = q.lt("position", block.position).order("position", { ascending: false }).limit(1);
  } else {
    q = q.gt("position", block.position).order("position", { ascending: true }).limit(1);
  }

  const { data: neighbor, error: nErr } = await q;
  if (nErr) return err(nErr.message, 500);

  const nb = neighbor?.[0];
  if (!nb) return NextResponse.json({ ok: true });

  const aPos = Number(block.position);
  const bPos = Number(nb.position);

  const { error: e1 } = await supabase.from("card_blocks").update({ position: bPos }).eq("id", block.id);
  if (e1) return err(e1.message, 500);

  const { error: e2 } = await supabase.from("card_blocks").update({ position: aPos }).eq("id", nb.id);
  if (e2) return err(e2.message, 500);

  return NextResponse.json({ ok: true, swappedWith: nb.id });
}