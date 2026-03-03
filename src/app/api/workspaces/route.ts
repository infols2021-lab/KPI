// src/app/api/workspaces/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function errStatus(msg: string) {
  const s = String(msg || "");
  if (s.toLowerCase().includes("unauthorized")) return 401;
  if (s.toLowerCase().includes("only owner")) return 403;
  if (s.toLowerCase().includes("permission")) return 403;
  if (s.toLowerCase().includes("rls")) return 403;
  return 500;
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // ✅ удаляем только через cascade-функцию (и она же проверяет owner)
    const { data, error } = await supabase.rpc("delete_workspace_cascade", {
      p_workspace_id: id,
    });

    if (error) {
      console.error("[api/workspaces DELETE] rpc error:", error);
      return NextResponse.json(
        { error: error.message || "Delete failed" },
        { status: errStatus(error.message) }
      );
    }

    // функция возвращает boolean
    if (!data) {
      return NextResponse.json(
        { error: "Workspace was not deleted (not found or not allowed)" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[api/workspaces DELETE] fatal:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

// PATCH: rename/description
export async function PATCH(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    // ✅ совместимость: старый клиент мог слать workspaceId вместо id
    const id = String(body?.id ?? body?.workspaceId ?? "").trim();

    const nameRaw = body?.name != null ? String(body.name) : null;
    const descriptionRaw = body?.description != null ? String(body.description) : null;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    if (nameRaw === null && descriptionRaw === null) {
      return NextResponse.json({ error: "name or description required" }, { status: 400 });
    }

    const patch: any = {};

    if (nameRaw !== null) {
      const name = nameRaw.trim();
      if (!name) return NextResponse.json({ error: "name must not be empty" }, { status: 400 });
      patch.name = name;
    }

    if (descriptionRaw !== null) {
      const d = descriptionRaw.trim();
      patch.description = d ? d : null;
    }

    const { data, error } = await supabase
      .from("workspaces")
      .update(patch)
      .eq("id", id)
      .select("id, name, description, owner_user_id, created_at, updated_at")
      .single();

    if (error) {
      console.error("[api/workspaces PATCH] error:", error);
      return NextResponse.json(
        { error: error.message || "Update failed" },
        { status: errStatus(error.message) }
      );
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error("[api/workspaces PATCH] fatal:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}