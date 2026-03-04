// src/app/api/cards/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function groupPathsByBucket(rows: Array<{ bucket: string; path: string }>) {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const bucket = String(r.bucket ?? "card-attachments");
    const path = String(r.path ?? "");
    if (!path) continue;
    if (!map.has(bucket)) map.set(bucket, []);
    map.get(bucket)!.push(path);
  }
  return map;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDeadline(input: any): string | null | "__INVALID__" {
  if (input === undefined) return null;
  if (input === null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const t = new Date(s).getTime();
  if (!Number.isFinite(t)) return "__INVALID__";
  return new Date(t).toISOString();
}

async function getColumnSystemKey(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  columnId: string
): Promise<"accepted" | "done" | null> {
  const { data, error } = await supabase.from("board_columns").select("system_key").eq("id", columnId).single();
  if (error) throw new Error(error.message);
  const key = data?.system_key ?? null;
  return key === "accepted" || key === "done" ? key : null;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);

  const workspaceId = String(body?.workspaceId ?? "");
  const boardId = String(body?.boardId ?? "");
  const columnId = String(body?.columnId ?? "");
  const title = String(body?.title ?? "").trim();

  const projectId = String(body?.projectId ?? "");
  const difficultyIdRaw = body?.difficultyId ?? null;
  const qualityLevelIdRaw = body?.qualityLevelId ?? null;

  const difficultyId = difficultyIdRaw ? String(difficultyIdRaw) : null;
  const qualityLevelId = qualityLevelIdRaw ? String(qualityLevelIdRaw) : null;

  const deadlineNorm = normalizeDeadline(body?.deadline);
  if (deadlineNorm === "__INVALID__") return jsonError("Invalid deadline", 400);

  if (!workspaceId || !boardId || !columnId || !title || !projectId) {
    return jsonError("workspaceId/boardId/columnId/title/projectId required", 400);
  }

  // если создают сразу в системной колонке accepted/done — фиксируем timestamp сдачи
  let acceptedAt: string | null = null;
  try {
    const sys = await getColumnSystemKey(supabase, columnId);
    if (sys === "accepted" || sys === "done") acceptedAt = nowIso();
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to read column", 500);
  }

  const { data: last, error: lastErr } = await supabase
    .from("cards")
    .select("position")
    .eq("board_id", boardId)
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1);

  if (lastErr) return jsonError(lastErr.message, 500);

  const position = (last?.[0]?.position ?? 0) + 1;

  const { data, error } = await supabase
    .from("cards")
    .insert({
      workspace_id: workspaceId,
      board_id: boardId,
      column_id: columnId,
      title,
      project_id: projectId,
      difficulty_id: difficultyId,
      quality_level_id: qualityLevelId,
      deadline: deadlineNorm ? deadlineNorm : null,
      accepted_at: acceptedAt,
      created_by: userData.user.id,
      position,
    })
    .select(
      "id, title, column_id, position, timer_total_seconds, timer_running, deadline, project_id, difficulty_id, quality_level_id, accepted_at, created_at, updated_at"
    )
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return jsonError("id required", 400);

  const patch: any = {};

  if (body.title != null) patch.title = String(body.title);

  if (body.deadline !== undefined) {
    const deadlineNorm = normalizeDeadline(body.deadline);
    if (deadlineNorm === "__INVALID__") return jsonError("Invalid deadline", 400);
    patch.deadline = deadlineNorm ? deadlineNorm : null;
  }

  if (body.projectId !== undefined) patch.project_id = body.projectId ? String(body.projectId) : null;

  if (body.difficultyId !== undefined) {
    patch.difficulty_id = body.difficultyId ? String(body.difficultyId) : null;
  }

  if (body.qualityLevelId !== undefined) {
    patch.quality_level_id = body.qualityLevelId ? String(body.qualityLevelId) : null;
  }

  // ✅ фиксация accepted_at ТОЛЬКО при реальном переходе карточки в системную колонку accepted/done
  if (body.columnId !== undefined) {
    const newColumnId = String(body.columnId);

    const { data: cur, error: curErr } = await supabase.from("cards").select("column_id").eq("id", id).single();
    if (curErr) return jsonError(curErr.message, 500);

    const oldColumnId = String(cur?.column_id ?? "");
    patch.column_id = newColumnId;

    if (oldColumnId && newColumnId && oldColumnId !== newColumnId) {
      try {
        const sys = await getColumnSystemKey(supabase, newColumnId);
        if (sys === "accepted" || sys === "done") {
          patch.accepted_at = nowIso();
        }
      } catch (e: any) {
        return jsonError(e?.message ?? "Failed to read column", 500);
      }
    }
  }

  if (body.position !== undefined) patch.position = Number(body.position);

  const { data, error } = await supabase
    .from("cards")
    .update(patch)
    .eq("id", id)
    .select(
      "id, title, column_id, position, timer_total_seconds, timer_running, deadline, project_id, difficulty_id, quality_level_id, accepted_at, created_at, updated_at"
    )
    .single();

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "");
  if (!id) return jsonError("id required", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError("Unauthorized", 401);

  // 0) соберём все файлы (attachments + comment attachments), чтобы попытаться удалить из storage
  const { data: atts, error: attsErr } = await supabase.from("card_attachments").select("bucket, path").eq("card_id", id);
  if (attsErr) return jsonError(attsErr.message, 500);

  const { data: comms, error: commErr } = await supabase.from("card_comments").select("id").eq("card_id", id);
  if (commErr) return jsonError(commErr.message, 500);

  const commentIds = (comms ?? []).map((x: any) => x.id).filter(Boolean);

  let commAtts: Array<{ bucket: string; path: string }> = [];
  if (commentIds.length > 0) {
    const { data: ca, error: caErr } = await supabase
      .from("card_comment_attachments")
      .select("bucket, path")
      .in("comment_id", commentIds);

    if (caErr) return jsonError(caErr.message, 500);
    commAtts = (ca ?? []) as any;
  }

  // ✅ попытка удалить файлы из storage (не ломаем удаление карточки, если политики не дают)
  try {
    const byBucket = groupPathsByBucket([...(atts ?? []), ...(commAtts ?? [])] as any);
    for (const [bucket, paths] of byBucket.entries()) {
      if (paths.length === 0) continue;
      await supabase.storage.from(bucket).remove(paths);
    }
  } catch {
    // ignore
  }

  // 1) comment attachments (через comments)
  if (commentIds.length > 0) {
    const { error: caDelErr } = await supabase.from("card_comment_attachments").delete().in("comment_id", commentIds);
    if (caDelErr) return jsonError(caDelErr.message, 500);
  }

  // 2) child tables
  const del1 = await supabase.from("card_comments").delete().eq("card_id", id);
  if (del1.error) return jsonError(del1.error.message, 500);

  const del2 = await supabase.from("card_attachments").delete().eq("card_id", id);
  if (del2.error) return jsonError(del2.error.message, 500);

  const del3 = await supabase.from("card_links").delete().eq("card_id", id);
  if (del3.error) return jsonError(del3.error.message, 500);

  const del4 = await supabase.from("card_checklist_items").delete().eq("card_id", id);
  if (del4.error) return jsonError(del4.error.message, 500);

  const del5 = await supabase.from("card_blocks").delete().eq("card_id", id);
  if (del5.error) return jsonError(del5.error.message, 500);

  // 3) finally card
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}