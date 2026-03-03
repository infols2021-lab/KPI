import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jerr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jerr("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const columnId = String(body?.columnId ?? "");
    const direction = String(body?.direction ?? ""); // "left" | "right"
    if (!columnId || (direction !== "left" && direction !== "right")) {
      return jerr("columnId + direction(left/right) required", 400);
    }

    const { data: target, error: tErr } = await supabase
      .from("board_columns")
      .select("id, board_id, position, system_key")
      .eq("id", columnId)
      .maybeSingle();

    if (tErr) return jerr(tErr.message, 500);
    if (!target) return jerr("Column not found", 404);
    if (target.system_key) return jerr("System columns cannot be moved", 400);

    const boardId = String(target.board_id);

    // берем ТОЛЬКО НЕ-системные колонки (системные done/accepted не трогаем и не перескакиваем через них)
    const { data: colsRaw, error: cErr } = await supabase
      .from("board_columns")
      .select("id, position, created_at")
      .eq("board_id", boardId)
      .is("system_key", null)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (cErr) return jerr(cErr.message, 500);

    const cols = (colsRaw ?? []).map((r: any) => ({
      id: String(r.id),
      position: Number(r.position ?? 0),
      created_at: String(r.created_at ?? ""),
    }));

    const idx = cols.findIndex((c) => c.id === columnId);
    if (idx === -1) return NextResponse.json({ ok: true }); // странно, но не падаем

    // ✅ нормализация позиций, чтобы не было дублей/хаоса (из-за них "перестаёт двигаться")
    let needNormalize = false;
    let prev = -Infinity;
    for (const c of cols) {
      const p = Number(c.position);
      if (!Number.isFinite(p) || p <= prev) {
        needNormalize = true;
        break;
      }
      prev = p;
    }

    if (needNormalize) {
      // выставим позиции 0,10,20... чтобы точно были уникальны и сортируемы
      for (let i = 0; i < cols.length; i++) {
        const want = i * 10;
        if (cols[i].position !== want) {
          const { error } = await supabase.from("board_columns").update({ position: want }).eq("id", cols[i].id);
          if (error) return jerr(error.message, 500);
          cols[i].position = want;
        }
      }
    }

    // пересчитаем idx (на всякий, хотя порядок не менялся)
    const idx2 = cols.findIndex((c) => c.id === columnId);
    if (idx2 === -1) return NextResponse.json({ ok: true });

    const neighborIndex = direction === "left" ? idx2 - 1 : idx2 + 1;
    if (neighborIndex < 0 || neighborIndex >= cols.length) {
      return NextResponse.json({ ok: true }); // край
    }

    const a = cols[idx2];
    const b = cols[neighborIndex];

    const aPos = a.position;
    const bPos = b.position;

    // swap positions safely via temp
    const temp = -999999999;

    const { error: e1 } = await supabase.from("board_columns").update({ position: temp }).eq("id", a.id);
    if (e1) return jerr(e1.message, 500);

    const { error: e2 } = await supabase.from("board_columns").update({ position: aPos }).eq("id", b.id);
    if (e2) return jerr(e2.message, 500);

    const { error: e3 } = await supabase.from("board_columns").update({ position: bPos }).eq("id", a.id);
    if (e3) return jerr(e3.message, 500);

    return NextResponse.json({ ok: true, swappedWith: b.id });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}