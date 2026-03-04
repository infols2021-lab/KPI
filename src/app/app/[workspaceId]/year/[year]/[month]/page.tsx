// src/app/app/[workspaceId]/year/[year]/[month]/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MonthView from "./ui";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ workspaceId: string; year: string; month: string }>;
}) {
  const { workspaceId, year, month } = await params;
  const y = Number(year);
  const m = Number(month);

  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    redirect(`/app/${workspaceId}/years`);
  }

  const supabase = await createSupabaseServerClient();

  const { data: board, error: bErr } = await supabase
    .from("boards")
    .select("id, year, month")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .eq("month", m)
    .single();

  if (bErr || !board) redirect(`/app/${workspaceId}/years`);

  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, title, position, system_key, is_locked")
    .eq("board_id", board.id)
    .order("position", { ascending: true });

  const { data: cards } = await supabase
    .from("cards")
    .select(
      "id, title, column_id, position, timer_total_seconds, timer_running, deadline, project_id, difficulty_id, quality_level_id, accepted_at, created_at, updated_at"
    )
    .eq("board_id", board.id)
    .order("position", { ascending: true });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .order("created_at", { ascending: false });

  const { data: difficulties } = await supabase
    .from("workspace_year_difficulty_levels")
    .select("id, code, points")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .order("sort_order", { ascending: true });

  const { data: qualities } = await supabase
    .from("workspace_year_quality_levels")
    .select("id, code, title, coef")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .order("sort_order", { ascending: true });

  const { data: ys } = await supabase
    .from("workspace_year_settings")
    .select("point_price")
    .eq("workspace_id", workspaceId)
    .eq("year", y)
    .maybeSingle();

  return (
    <MonthView
      workspaceId={workspaceId}
      year={y}
      month={m}
      boardId={board.id}
      pointPrice={Number(ys?.point_price ?? 200)}
      columns={columns ?? []}
      cards={cards ?? []}
      projects={projects ?? []}
      difficulties={difficulties ?? []}
      qualities={qualities ?? []}
    />
  );
}