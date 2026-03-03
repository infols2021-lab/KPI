// src/app/app/workspaces/ui.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import ThemeToggle from "@/components/ThemeToggle";
import Modal from "@/components/Modal";

type WorkspaceItem = {
  role: "owner" | "admin" | "member";
  joined_at: string;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    owner_user_id: string;
    created_at: string;
  };
};

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Non-JSON response (${res.status}). ${txt.slice(0, 160)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

export default function WorkspacesClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ⋯ menu
  const [menu, setMenu] = useState<null | { wsId: string; x: number; y: number }>(null);

  // delete confirm modal (2-step)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWsId, setConfirmWsId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<"name" | "delete">("name");
  const [confirmText, setConfirmText] = useState("");

  const confirmWs = confirmWsId ? items.find((x) => x.workspace.id === confirmWsId) ?? null : null;

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const json = await fetchJson("/api/workspaces/list");
      setItems(json.data ?? []);
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace() {
    setLoading(true);
    setMsg(null);
    try {
      const json = await fetchJson("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const wsId = json.workspaceId as string;
      localStorage.setItem("kpi.activeWorkspaceId", wsId);

      setName("");
      setDescription("");

      window.location.href = `/app/${wsId}/years`;
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function openWorkspace(wsId: string) {
    localStorage.setItem("kpi.activeWorkspaceId", wsId);
    window.location.href = `/app/${wsId}/years`;
  }

  function openMenu(wsId: string, btn: HTMLButtonElement) {
    const rect = btn.getBoundingClientRect();
    const menuW = 220;
    const menuH = 120;

    let x = rect.right - menuW;
    x = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));

    let y = rect.bottom + 8;
    if (y + menuH > window.innerHeight - 8) y = rect.top - menuH - 8;
    y = Math.max(8, y);

    setMenu({ wsId, x, y });
  }

  async function renameWorkspace(wsId: string, currentName: string) {
    const next = prompt("Новое название:", currentName);
    if (!next?.trim()) return;

    setLoading(true);
    setMsg(null);
    try {
      // ✅ FIX: API ждёт id (раньше тут был workspaceId -> из-за этого падало)
      await fetchJson("/api/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: wsId, name: next.trim() }),
      });

      setItems((prev) =>
        prev.map((it) =>
          it.workspace.id === wsId ? { ...it, workspace: { ...it.workspace, name: next.trim() } } : it
        )
      );
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function startDeleteWorkspace(wsId: string) {
    setConfirmWsId(wsId);
    setConfirmStep("name");
    setConfirmText("");
    setConfirmOpen(true);
  }

  async function doDeleteWorkspace() {
    if (!confirmWs) return;

    const required = confirmStep === "name" ? confirmWs.workspace.name : "DELETE";
    if (confirmText.trim() !== required) return;

    setLoading(true);
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces?id=${encodeURIComponent(confirmWs.workspace.id)}`, { method: "DELETE" });

      setItems((prev) => prev.filter((x) => x.workspace.id !== confirmWs.workspace.id));

      try {
        const active = localStorage.getItem("kpi.activeWorkspaceId");
        if (active === confirmWs.workspace.id) localStorage.removeItem("kpi.activeWorkspaceId");
      } catch {}

      setConfirmOpen(false);
      setConfirmWsId(null);
      setConfirmStep("name");
      setConfirmText("");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm opacity-70 mt-1">Выбери рабочее пространство или создай новое.</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="underline text-sm" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="font-semibold">Создать workspace</div>
          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
              placeholder="Название (например: KPI с руководителем)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none min-h-[90px]"
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60 dark:bg-white dark:text-black"
              disabled={loading || !name.trim()}
              onClick={createWorkspace}
            >
              {loading ? "..." : "Создать и открыть"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Мои workspaces</div>
            <button className="text-sm underline" onClick={load} disabled={loading}>
              Обновить
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm opacity-70">Пока пусто. Создай первый workspace слева.</div>
            ) : (
              items.map((it) => {
                const canManage = it.role === "owner" || it.role === "admin";
                const canDelete = it.role === "owner";

                return (
                  <div key={it.workspace.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{it.workspace.name}</div>
                        {it.workspace.description && (
                          <div className="text-sm opacity-70 mt-1 line-clamp-2">{it.workspace.description}</div>
                        )}
                        <div className="text-xs opacity-60 mt-2">Роль: {it.role}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button
                            className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={(e) => openMenu(it.workspace.id, e.currentTarget)}
                            title="Меню"
                          >
                            ⋯
                          </button>
                        )}

                        <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => openWorkspace(it.workspace.id)}>
                          Открыть
                        </button>

                        {menu?.wsId === it.workspace.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
                            <div
                              className="fixed z-50 w-[220px] rounded-2xl border bg-[rgb(var(--card))] shadow-sm overflow-hidden"
                              style={{ left: menu.x, top: menu.y }}
                            >
                              <button
                                className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                                onClick={() => {
                                  setMenu(null);
                                  renameWorkspace(it.workspace.id, it.workspace.name);
                                }}
                              >
                                Переименовать
                              </button>

                              {canDelete ? (
                                <button
                                  className="w-full text-left px-4 py-3 text-sm hover:bg-red-500/10"
                                  onClick={() => {
                                    setMenu(null);
                                    startDeleteWorkspace(it.workspace.id);
                                  }}
                                >
                                  Удалить…
                                </button>
                              ) : (
                                <div className="px-4 py-3 text-xs opacity-60">Удаление доступно только владельцу</div>
                              )}
                            </div>
                          </>
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

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmWsId(null);
          setConfirmStep("name");
          setConfirmText("");
        }}
      >
        <div className="p-5">
          <div className="text-xs opacity-70">Подтверждение</div>
          <div className="text-xl font-semibold mt-1">Удалить workspace?</div>

          <div className="mt-3 text-sm opacity-80">
            {confirmWs ? (
              <>
                Workspace: <span className="font-semibold">{confirmWs.workspace.name}</span>
              </>
            ) : (
              "—"
            )}
          </div>

          <div className="mt-4 rounded-2xl border p-3">
            {confirmStep === "name" ? (
              <div className="text-sm opacity-80">
                Введи <span className="font-semibold">точное название</span> workspace, чтобы продолжить.
              </div>
            ) : (
              <div className="text-sm opacity-80">
                Теперь введи <span className="font-semibold">DELETE</span> (капсом), чтобы удалить навсегда.
              </div>
            )}

            <input
              className="mt-3 w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmStep === "name" ? confirmWs?.workspace.name ?? "" : "DELETE"}
            />

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => {
                  if (confirmStep === "delete") {
                    setConfirmStep("name");
                    setConfirmText("");
                  } else {
                    setConfirmOpen(false);
                    setConfirmWsId(null);
                    setConfirmStep("name");
                    setConfirmText("");
                  }
                }}
                disabled={loading}
              >
                {confirmStep === "delete" ? "Назад" : "Отмена"}
              </button>

              {confirmStep === "name" ? (
                <button
                  className="rounded-xl bg-black text-white px-4 py-2 text-sm dark:bg-white dark:text-black disabled:opacity-60"
                  disabled={!confirmWs || confirmText.trim() !== confirmWs.workspace.name || loading}
                  onClick={() => {
                    setConfirmStep("delete");
                    setConfirmText("");
                  }}
                >
                  Продолжить
                </button>
              ) : (
                <button
                  className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                  disabled={confirmText.trim() !== "DELETE" || loading}
                  onClick={doDeleteWorkspace}
                >
                  Удалить навсегда
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}