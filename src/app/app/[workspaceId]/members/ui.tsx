"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Member = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
};

type Invite = {
  id: string;
  workspace_id: string;
  email: string | null;
  role: "admin" | "member";
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invite_url: string | null;
};

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

function shortId(id: string) {
  if (!id) return id;
  return id.slice(0, 8) + "…" + id.slice(-6);
}

export default function MembersClient({ workspaceId }: { workspaceId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [me, setMe] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [expiresDays, setExpiresDays] = useState("7");

  const [lastLink, setLastLink] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(data.user?.id ?? null);
    })();
  }, [supabase]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);
    try {
      const [m, i] = await Promise.all([
        fetchJson(`/api/workspaces/members?workspaceId=${workspaceId}`),
        fetchJson(`/api/workspaces/invites?workspaceId=${workspaceId}`),
      ]);
      setMembers(m.data ?? []);
      setInvites(i.data ?? []);
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    setLoading(true);
    setMsg(null);
    setLastLink(null);

    try {
      const days = Number(expiresDays);
      const json = await fetchJson("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          email: inviteEmail.trim() || null,
          role: inviteRole,
          expiresDays: Number.isFinite(days) ? days : 7,
        }),
      });

      const link = String(json.data.inviteUrl);
      setLastLink(link);
      setInviteEmail("");
      await loadAll();

      try {
        await navigator.clipboard.writeText(link);
        setMsg("Инвайт создан ✅ Ссылка скопирована");
      } catch {
        setMsg("Инвайт создан ✅");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvite(token: string) {
    if (!confirm("Отозвать приглашение?")) return;
    setLoading(true);
    setMsg(null);
    try {
      await fetchJson("/api/workspaces/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, token, action: "revoke" }),
      });
      await loadAll();
      setMsg("Приглашение отозвано ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Убрать участника из workspace?")) return;
    setLoading(true);
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/members?workspaceId=${workspaceId}&userId=${userId}`, {
        method: "DELETE",
      });
      await loadAll();
      setMsg("Участник удалён ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, role: "admin" | "member") {
    setLoading(true);
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId, role }),
      });
      await loadAll();
      setMsg("Роль обновлена ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs opacity-70">Workspace</div>
          <h1 className="text-2xl font-semibold">Участники</h1>
          <div className="text-sm opacity-70 mt-1">
            Добавляй людей по ссылке. Если указать email — принять сможет только владелец этого email.
          </div>
        </div>

        <div className="flex gap-2">
          <button className="rounded-xl border px-4 py-2" onClick={loadAll} disabled={loading}>
            Обновить
          </button>
          <a className="rounded-xl border px-4 py-2" href={`/app/${workspaceId}/years`}>
            Назад
          </a>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* INVITES */}
        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="font-semibold">Приглашения</div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
              placeholder="Email (необязательно)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>

              <input
                className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                placeholder="Срок (дней)"
              />
            </div>

            <button
              className="rounded-xl bg-black text-white px-4 py-2 font-medium disabled:opacity-60"
              onClick={createInvite}
              disabled={loading}
            >
              {loading ? "..." : "Создать инвайт"}
            </button>

            {lastLink && (
              <div className="rounded-xl border p-3 text-sm break-all">
                <div className="text-xs opacity-70">Ссылка</div>
                <div className="mt-1">{lastLink}</div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold">Список инвайтов</div>

            <div className="mt-3 space-y-3">
              {invites.length === 0 ? (
                <div className="text-sm opacity-70">Пока нет инвайтов.</div>
              ) : (
                invites.map((it) => {
                  const pending = !it.accepted_at && !it.revoked_at;
                  return (
                    <div key={it.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {it.email ? it.email : "Без email (по ссылке)"}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            роль: {it.role} • истекает: {new Date(it.expires_at).toLocaleString()}
                          </div>
                          <div className="text-xs opacity-70 mt-1">
                            token: {shortId(it.token)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {it.invite_url && (
                            <button
                              className="rounded-xl border px-3 py-2 text-sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(it.invite_url!);
                                  setMsg("Ссылка скопирована ✅");
                                } catch {
                                  setMsg("Не удалось скопировать");
                                }
                              }}
                            >
                              Копировать
                            </button>
                          )}

                          {pending ? (
                            <button
                              className="rounded-xl border px-3 py-2 text-sm"
                              onClick={() => revokeInvite(it.token)}
                              disabled={loading}
                            >
                              Отозвать
                            </button>
                          ) : (
                            <span className="text-xs opacity-70">
                              {it.revoked_at ? "revoked" : "accepted"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MEMBERS */}
        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="font-semibold">Участники</div>

          <div className="mt-3 space-y-3">
            {members.length === 0 ? (
              <div className="text-sm opacity-70">Пока нет участников.</div>
            ) : (
              members.map((m) => {
                const isMe = me && m.user_id === me;
                return (
                  <div key={m.user_id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {isMe ? "Ты" : shortId(m.user_id)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          роль: {m.role} • joined: {new Date(m.joined_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isMe && m.role !== "owner" && (
                          <>
                            <select
                              className="rounded-xl border px-2 py-2 bg-transparent outline-none text-sm"
                              value={m.role === "admin" ? "admin" : "member"}
                              onChange={(e) => changeRole(m.user_id, e.target.value as any)}
                              disabled={loading}
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </select>

                            <button
                              className="rounded-xl border px-3 py-2 text-sm"
                              onClick={() => removeMember(m.user_id)}
                              disabled={loading}
                            >
                              Удалить
                            </button>
                          </>
                        )}

                        {isMe && m.role !== "owner" && (
                          <button
                            className="rounded-xl border px-3 py-2 text-sm"
                            onClick={() => removeMember(m.user_id)}
                            disabled={loading}
                          >
                            Выйти
                          </button>
                        )}

                        {m.role === "owner" && <span className="text-xs opacity-70">owner</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}