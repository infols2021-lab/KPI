import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? "");
  const year = Number(body?.year);
  const pointPrice = Number(body?.pointPrice);

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });
  if (!Number.isFinite(pointPrice) || pointPrice < 0)
    return NextResponse.json({ error: "Bad pointPrice" }, { status: 400 });

  const { error } = await supabase
    .from("workspace_year_settings")
    .upsert(
      { workspace_id: workspaceId, year, point_price: pointPrice },
      { onConflict: "workspace_id,year" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}