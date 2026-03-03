import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = String(searchParams.get("workspaceId") ?? "");
  const year = Number(searchParams.get("year"));

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (!Number.isFinite(year)) return NextResponse.json({ error: "year required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ys, error: ysErr } = await supabase
    .from("workspace_year_settings")
    .select("point_price")
    .eq("workspace_id", workspaceId)
    .eq("year", year)
    .maybeSingle();

  if (ysErr) return NextResponse.json({ error: ysErr.message }, { status: 500 });

  const { data: diffs, error: dErr } = await supabase
    .from("workspace_year_difficulty_levels")
    .select("id, code, title, points")
    .eq("workspace_id", workspaceId)
    .eq("year", year)
    .order("sort_order", { ascending: true });

  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const { data: quals, error: qErr } = await supabase
    .from("workspace_year_quality_levels")
    .select("id, code, title, coef")
    .eq("workspace_id", workspaceId)
    .eq("year", year)
    .order("sort_order", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({
    data: {
      point_price: ys?.point_price ?? 200,
      difficulties: diffs ?? [],
      qualities: quals ?? [],
    },
  });
}