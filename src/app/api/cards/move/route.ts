import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const cardId = String(body?.cardId ?? "");
    const direction = String(body?.direction ?? ""); // "up" | "down"

    if (!cardId || (direction !== "up" && direction !== "down")) {
      return NextResponse.json({ error: "cardId + direction(up/down) required" }, { status: 400 });
    }

    const { data: card, error: cErr } = await supabase
      .from("cards")
      .select("id, board_id, column_id, position")
      .eq("id", cardId)
      .single();

    if (cErr || !card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    // UI сортирует по position ASC
    // up: ищем ближайшую позицию МЕНЬШЕ текущей (desc + lt)
    // down: ищем ближайшую позицию БОЛЬШЕ текущей (asc + gt)
    const isUp = direction === "up";

    let q = supabase
      .from("cards")
      .select("id, position")
      .eq("board_id", card.board_id)
      .eq("column_id", card.column_id)
      .order("position", { ascending: !isUp }) // up => desc, down => asc
      .limit(1);

    const { data: neighbor, error: nErr } = isUp
      ? await q.lt("position", card.position)
      : await q.gt("position", card.position);

    if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });

    const nb = neighbor?.[0];
    if (!nb) return NextResponse.json({ ok: true }); // край

    const aPos = Number(card.position);
    const bPos = Number(nb.position);

    const { error: e1 } = await supabase.from("cards").update({ position: bPos }).eq("id", card.id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    const { error: e2 } = await supabase.from("cards").update({ position: aPos }).eq("id", nb.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

    return NextResponse.json({ ok: true, swappedWith: nb.id, newPosition: bPos, neighborNewPosition: aPos });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}