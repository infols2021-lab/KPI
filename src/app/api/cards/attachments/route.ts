import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jerr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(name: string) {
  const s = String(name ?? "").trim();
  if (!s) return "file";
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80) || "file";
}

function makeUid() {
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jerr("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const cardId = String(body?.cardId ?? "").trim();
    const fileName = safeFileName(body?.fileName);
    const mimeType = body?.mimeType != null ? String(body.mimeType) : null;
    const sizeBytes = body?.sizeBytes != null ? Number(body.sizeBytes) : null;

    if (!cardId) return jerr("cardId required", 400);

    // ✅ берём workspace_id с карточки (RLS проверит доступ)
    const { data: card, error: cErr } = await supabase
      .from("cards")
      .select("id, workspace_id")
      .eq("id", cardId)
      .single();

    if (cErr) return jerr(cErr.message, 500);
    if (!card) return jerr("Card not found", 404);

    const workspaceId = String((card as any).workspace_id ?? "");
    if (!workspaceId) return jerr("Card has no workspace_id", 500);

    const bucket = "card-attachments";
    // ✅ под твою storage policy: ws/<workspaceId>/...
    const path = `ws/${workspaceId}/cards/${cardId}/${Date.now()}_${makeUid()}_${fileName}`;

    const { data: row, error: iErr } = await supabase
      .from("card_attachments")
      .insert({
        workspace_id: workspaceId,
        card_id: cardId,
        bucket,
        path,
        mime_type: mimeType,
        size_bytes: Number.isFinite(sizeBytes as any) ? sizeBytes : null,
        is_cover: false,
      })
      .select("id, card_id, bucket, path, mime_type, size_bytes, width, height, is_cover, created_at")
      .single();

    if (iErr) return jerr(iErr.message, 500);

    return NextResponse.json({
      data: {
        attachment: row,
        upload: { bucket, path },
      },
    });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();
    if (!id) return jerr("id required", 400);

    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jerr("Unauthorized", 401);

    // RLS проверит доступ
    const { data: row, error } = await supabase
      .from("card_attachments")
      .select("id, card_id")
      .eq("id", id)
      .single();

    if (error) return jerr(error.message, 500);
    if (!row) return jerr("Not found", 404);

    // чистим блоки, которые ссылались на attachmentId
    const cardId = String((row as any).card_id ?? "");
    if (cardId) {
      await supabase
        .from("card_blocks")
        .delete()
        .eq("card_id", cardId)
        .eq("type", "attachment")
        .filter("payload->>attachmentId", "eq", id);
    }

    const { error: dErr } = await supabase.from("card_attachments").delete().eq("id", id);
    if (dErr) return jerr(dErr.message, 500);

    // storage объект не трогаем (для этого нужна delete policy или service role)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jerr(e?.message ?? "Server error", 500);
  }
}