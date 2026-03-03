import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return host ? `${proto}://${host}` : "";
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workspaceId = String(searchParams.get("workspaceId") ?? "").trim();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, token, created_at, expires_at, accepted_at, accepted_by, revoked_at, created_by")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = getOrigin(req);
  const items = (data ?? []).map((x: any) => ({
    ...x,
    invite_url: origin ? `${origin}/invite/${x.token}` : null,
  }));

  return NextResponse.json({ data: items });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? "").trim();
  const emailRaw = String(body?.email ?? "").trim();
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const role = String(body?.role ?? "member");
  const expiresDays = Number(body?.expiresDays ?? 7);

  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  if (email && !email.includes("@")) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (role !== "member" && role !== "admin") return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (!Number.isFinite(expiresDays) || expiresDays < 1 || expiresDays > 90) {
    return NextResponse.json({ error: "expiresDays must be 1..90" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_workspace_invite", {
    p_workspace_id: workspaceId,
    p_email: email,
    p_role: role,
    p_expires_days: expiresDays,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const token = String(data ?? "");
  if (!isUuid(token)) return NextResponse.json({ error: "Bad token from RPC" }, { status: 500 });

  const origin = getOrigin(req);
  const inviteUrl = origin ? `${origin}/invite/${token}` : `/invite/${token}`;

  return NextResponse.json({ data: { token, inviteUrl } });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const workspaceId = String(body?.workspaceId ?? "").trim();
  const token = String(body?.token ?? "").trim();
  const action = String(body?.action ?? "").trim(); // "revoke"

  if (!workspaceId || !token || action !== "revoke") {
    return NextResponse.json({ error: "workspaceId + token + action=revoke required" }, { status: 400 });
  }
  if (!isUuid(token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const { error } = await supabase
    .from("workspace_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("token", token)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}