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
    const workspaceId = String(body?.workspaceId ?? "");
    const boardId = String(body?.boardId ?? "");
    const title = String(body?.title ?? "").trim();

    if (!workspaceId || !boardId || !title) return jerr("workspaceId + boardId + title required", 400);

    // optional guard: board must belong to workspace
    const { data: board, error: bErr } = await supabase
      .from("boards")
      .select("id, workspace_id")
      .eq("id", boardId)
      .maybeSingle();

    if (bErr) return jerr(bErr.message, 500);
    if (!board) return jerr("Board not found", 404);
    if (String(board.workspace_id) !== workspaceId) return jerr("Board does not belong to workspace", 403);

    // ✅ make new column ALWAYS left-most:
    // take minimal position among all columns on this board and set newPos smaller
    const { data: minRow, error: mErr } = await supabase
      .from("board_columns")
      .select("position")
      .eq("board_id", boardId)
      .order("position", { ascending: true })
      .limit(1);

    if (mErr) return jerr(mErr.message, 500);

    const minPos = minRow?.[0]?.position != null ? Number(minRow[0].position) : 0;
    const newPos = Number.isFinite(minPos) ? minPos - 10 : -10;

    const { data, error } = await supabase
      .from("board_columns")
      .insert({
        workspace_id: workspaceId,
        board_id: boardId,
        title,
        position: newPos,
        system_key: null,
        is_locked: false,
      })
      .select("id, title, position, system_key, is_locked")
      .single();

    if (error) return jerr(error.message, 500);

    return NextResponse.json({ data });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jerr("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "");
    const title = body?.title != null ? String(body.title).trim() : null;

    if (!id) return jerr("id required", 400);

    const patch: any = {};
    if (title != null && title !== "") patch.title = title;

    const { error } = await supabase.from("board_columns").update(patch).eq("id", id);
    if (error) return jerr(error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "");
    if (!id) return jerr("id required", 400);

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jerr("Unauthorized", 401);

    // ✅ prefer cascade delete via RPC (you already created it)
    const { error: rpcErr } = await supabase.rpc("delete_column_cascade", { p_column_id: id });
    if (rpcErr) {
      return jerr(
        `Delete failed: ${rpcErr.message}\nTip: make sure function delete_column_cascade(uuid) exists and EXECUTE is granted to authenticated.`,
        500
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}