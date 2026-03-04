// src/app/api/cards/details/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cardId = String(searchParams.get("cardId") ?? "").trim();
    if (!cardId) return jsonError("cardId required", 400);

    const supabase = await createSupabaseServerClient();
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData.user) return jsonError("Unauthorized", 401);

    const { data: card, error: cErr } = await supabase
      .from("cards")
      .select(
        "id, workspace_id, board_id, column_id, title, description, deadline, timer_total_seconds, timer_running, timer_started_at, position, project_id, difficulty_id, quality_level_id, quality_coef, accepted_at, accepted_points_snapshot, accepted_quality_snapshot, created_by, created_at, updated_at"
      )
      .eq("id", cardId)
      .single();

    if (cErr) return jsonError(cErr.message, 500);
    if (!card) return jsonError("Card not found", 404);

    const [attachmentsRes, blocksRes, itemsRes, commentsRes] = await Promise.all([
      supabase
        .from("card_attachments")
        .select("id, card_id, bucket, path, mime_type, size_bytes, width, height, is_cover, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false }),

      supabase
        .from("card_blocks")
        .select("id, workspace_id, card_id, type, position, payload, created_at, updated_at")
        .eq("card_id", cardId)
        .order("position", { ascending: true }),

      supabase
        .from("card_checklist_items")
        .select("id, block_id, text, is_done, position, created_at, updated_at")
        .eq("card_id", cardId)
        .order("position", { ascending: true }),

      supabase
        .from("card_comments")
        .select("id, card_id, author_user_id, body, created_at")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false }),
    ]);

    if (attachmentsRes.error) return jsonError(attachmentsRes.error.message, 500);
    if (blocksRes.error) return jsonError(blocksRes.error.message, 500);
    if (itemsRes.error) return jsonError(itemsRes.error.message, 500);
    if (commentsRes.error) return jsonError(commentsRes.error.message, 500);

    const attachments = attachmentsRes.data ?? [];
    const blocks = blocksRes.data ?? [];
    const items = itemsRes.data ?? [];
    const comments = commentsRes.data ?? [];

    const itemsByBlock = new Map<string, any[]>();
    for (const it of items) {
      const bid = String((it as any).block_id ?? "");
      if (!bid) continue;
      if (!itemsByBlock.has(bid)) itemsByBlock.set(bid, []);
      itemsByBlock.get(bid)!.push(it);
    }

    const attById = new Map<string, any>();
    for (const a of attachments) attById.set(String((a as any).id), a);

    const enrichedBlocks = blocks.map((b: any) => {
      const type = String(b.type);
      const payload = b.payload ?? {};
      if (type === "checklist") {
        return { ...b, items: itemsByBlock.get(String(b.id)) ?? [] };
      }
      if (type === "attachment") {
        const attId = String(payload?.attachmentId ?? "");
        return { ...b, attachment: attId ? attById.get(attId) ?? null : null };
      }
      return b;
    });

    const commentIds = comments.map((c: any) => c.id).filter(Boolean);

    let commentAttachments: any[] = [];
    if (commentIds.length > 0) {
      const { data: ca, error: caErr } = await supabase
        .from("card_comment_attachments")
        .select("id, comment_id, bucket, path, mime_type, size_bytes, created_at")
        .in("comment_id", commentIds)
        .order("created_at", { ascending: false });

      if (caErr) return jsonError(caErr.message, 500);
      commentAttachments = ca ?? [];
    }

    return NextResponse.json(
      {
        data: {
          card,
          blocks: enrichedBlocks,
          attachments,
          comments,
          commentAttachments,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return jsonError(e?.message ?? "Server error", 500);
  }
}