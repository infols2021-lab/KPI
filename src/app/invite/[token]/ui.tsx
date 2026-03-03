"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

export default function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthed(!!data.user);
    })();
  }, [supabase]);

  async function accept() {
    setLoading(true);
    setMsg(null);
    try {
      const json = await fetchJson("/api/workspaces/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const wsId = String(json.data.workspaceId);
      localStorage.setItem("kpi.activeWorkspaceId", wsId);
      router.push(`/app/${wsId}/years`);
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function goLogin() {
    const next = `/invite/${token}`;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  }

  const nextHint = search?.get("next");

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="text-xs opacity-70">Приглашение в workspace</div>
        <h1 className="text-2xl font-semibold mt-1">Присоединиться</h1>

        <div className="mt-3 text-sm opacity-80 break-all">
          Токен: <span className="opacity-70">{token}</span>
        </div>

        {msg && <div className="mt-4 text-sm">{msg}</div>}

        <div className="mt-6 flex gap-2 flex-wrap">
          {isAuthed ? (
            <button
              className="rounded-xl bg-black text-white px-4 py-2 font-medium disabled:opacity-60"
              onClick={accept}
              disabled={loading}
            >
              {loading ? "..." : "Присоединиться"}
            </button>
          ) : (
            <button
              className="rounded-xl bg-black text-white px-4 py-2 font-medium"
              onClick={goLogin}
            >
              Войти, чтобы принять
            </button>
          )}

          <a className="rounded-xl border px-4 py-2" href="/app/workspaces">
            К workspaces
          </a>
        </div>

        {nextHint && (
          <div className="mt-4 text-xs opacity-60">
            next: {nextHint}
          </div>
        )}
      </div>
    </div>
  );
}