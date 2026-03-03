import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jerr(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFileName(name: string) {
  const s = String(name ?? "").trim();
  if (!s) return "file";
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 80) || "file";
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jerr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const commentId = String(body?.commentId ?? "").trim();
  const fileName = safeFileName(String(body?.fileName ?? ""));
  const mimeType = body?.mimeType != null ? String(body.mimeType) : null;
  const sizeBytes = body?.sizeBytes != null ? Number(body.sizeBytes) : null;

  if (!commentId) return jerr("commentId required", 400);

  // берём workspace_id из comment (а не с клиента)
  const { data: comment, error: cErr } = await supabase
    .from("card_comments")
    .select("id, workspace_id")
    .eq("id", commentId)
    .single();

  if (cErr) return jerr(cErr.message, 500);
  if (!comment) return jerr("Comment not found", 404);

  const workspaceId = String((comment as any).workspace_id ?? "");
  if (!workspaceId) return jerr("Comment has no workspace_id", 500);

  const bucket = "card-attachments";
  const uid = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const path = `ws/${workspaceId}/comments/${commentId}/${Date.now()}_${uid}_${fileName}`;

  // 1) создаём row
  const { data: row, error: iErr } = await supabase
    .from("card_comment_attachments")
    .insert({
      workspace_id: workspaceId,
      comment_id: commentId,
      bucket,
      path,
      mime_type: mimeType,
      size_bytes: Number.isFinite(sizeBytes as any) ? sizeBytes : null,
    })
    .select("id, comment_id, bucket, path, mime_type, size_bytes, created_at")
    .single();

  if (iErr) return jerr(iErr.message, 500);

  // 2) signed upload url
  const { data: upData, error: upErr } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (upErr || !upData?.signedUrl) {
    await supabase.from("card_comment_attachments").delete().eq("id", (row as any)?.id ?? "");
    return jerr(upErr?.message ?? "Failed to create signed upload url", 500);
  }

  // 3) сразу signed download url (чтобы клиент мог показать картинку без reload)
  const { data: dlData, error: dlErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  const signed_url = dlErr ? null : (dlData?.signedUrl ?? null);

  return NextResponse.json({
    data: {
      attachment: { ...(row as any), signed_url },
      upload: {
        signedUrl: upData.signedUrl,
        path: upData.path ?? path,
        token: (upData as any).token ?? null,
      },
    },
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return jerr("id required", 400);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jerr("Unauthorized", 401);

  const { data: row, error } = await supabase
    .from("card_comment_attachments")
    .select("id, bucket, path")
    .eq("id", id)
    .single();

  if (error) return jerr(error.message, 500);
  if (!row) return jerr("Not found", 404);

  const bucket = String((row as any).bucket ?? "card-attachments");
  const path = String((row as any).path ?? "");

  const { error: dErr } = await supabase.from("card_comment_attachments").delete().eq("id", id);
  if (dErr) return jerr(dErr.message, 500);

  if (path) {
    try {
      await supabase.storage.from(bucket).remove([path]);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true });
}