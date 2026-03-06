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

function cardButtonBase(active = false) {
  return [
    "rounded-xl px-3 py-2 text-sm transition-all duration-200",
    "border border-[rgb(var(--border))]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
    active
      ? "bg-sky-100 text-sky-950 shadow-[0_8px_24px_rgba(56,189,248,0.18)] dark:bg-white dark:text-black dark:shadow-none"
      : "bg-white/90 text-[rgb(var(--fg))] hover:-translate-y-[1px] hover:bg-sky-50 hover:shadow-[0_10px_24px_rgba(56,189,248,0.14)] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:shadow-none",
  ].join(" ");
}

function primaryButtonBase(disabled = false) {
  return [
    "rounded-xl px-4 py-2 font-medium transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
    disabled
      ? "bg-slate-200 text-slate-500 border border-slate-200 cursor-not-allowed dark:bg-white/15 dark:text-white/45 dark:border-white/10"
      : "bg-sky-100 text-sky-950 border border-sky-200 shadow-[0_10px_24px_rgba(56,189,248,0.18)] hover:-translate-y-[1px] hover:bg-sky-200 hover:shadow-[0_14px_30px_rgba(56,189,248,0.24)] dark:bg-white dark:text-black dark:border-white dark:shadow-none dark:hover:bg-white/90 dark:hover:shadow-none",
  ].join(" ");
}

export default function WorkspacesClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [menu, setMenu] = useState<null | { wsId: string; x: number; y: number }>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWsId, setConfirmWsId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<"name" | "delete">("name");
  const [confirmText, setConfirmText] = useState("");

  const confirmWs = confirmWsId ? items.find((x) => x.workspace.id === confirmWsId) ?? null : null;
  const menuItem = menu?.wsId ? items.find((x) => x.workspace.id === menu.wsId) ?? null : null;

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

    setMenu((prev) => {
      if (prev?.wsId === wsId) return null;
      return { wsId, x, y };
    });
  }

  async function renameWorkspace(wsId: string, currentName: string) {
    const next = prompt("Новое название:", currentName);
    if (!next?.trim()) return;

    setLoading(true);
    setMsg(null);
    try {
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

  const createDisabled = loading || !name.trim();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm opacity-70 mt-1">Выбери рабочее пространство или создай новое.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ThemeToggle />
          <button
            className="text-sm underline opacity-90 transition-opacity duration-200 hover:opacity-100"
            onClick={logout}
          >
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
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-all duration-200"
              placeholder="Название (например: KPI с руководителем)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none min-h-[90px] transition-all duration-200"
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              className={`w-full ${primaryButtonBase(createDisabled)}`}
              disabled={createDisabled}
              onClick={createWorkspace}
            >
              {loading ? "..." : "Создать и открыть"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Мои workspaces</div>
            <button
              className="text-sm underline opacity-90 transition-opacity duration-200 hover:opacity-100"
              onClick={load}
              disabled={loading}
            >
              Обновить
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm opacity-70">Пока пусто. Создай первый workspace слева.</div>
            ) : (
              items.map((it) => {
                const canManage = it.role === "owner" || it.role === "admin";

                return (
                  <div
                    key={it.workspace.id}
                    className="rounded-xl border p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(56,189,248,0.12)] dark:hover:shadow-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{it.workspace.name}</div>

                        {it.workspace.description && (
                          <div className="text-sm opacity-70 mt-1 line-clamp-2">{it.workspace.description}</div>
                        )}

                        <div className="text-xs opacity-60 mt-2">Роль: {it.role}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {canManage && (
                          <button
                            className={cardButtonBase(menu?.wsId === it.workspace.id)}
                            onClick={(e) => openMenu(it.workspace.id, e.currentTarget)}
                            title="Меню"
                            type="button"
                          >
                            ⋯
                          </button>
                        )}

                        <button
                          className={cardButtonBase(false)}
                          onClick={() => openWorkspace(it.workspace.id)}
                          type="button"
                        >
                          Открыть
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {menu && menuItem && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-[220px] rounded-2xl border bg-[rgb(var(--card))] shadow-[0_16px_40px_rgba(15,23,42,0.16)] overflow-hidden dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              className="w-full text-left px-4 py-3 text-sm transition-colors duration-200 hover:bg-sky-50 dark:hover:bg-white/10"
              type="button"
              onClick={() => {
                const wsId = menuItem.workspace.id;
                const wsName = menuItem.workspace.name;
                setMenu(null);
                renameWorkspace(wsId, wsName);
              }}
            >
              Переименовать
            </button>

            {menuItem.role === "owner" ? (
              <button
                className="w-full text-left px-4 py-3 text-sm transition-colors duration-200 hover:bg-red-500/10"
                type="button"
                onClick={() => {
                  const wsId = menuItem.workspace.id;
                  setMenu(null);
                  startDeleteWorkspace(wsId);
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
              className="mt-3 w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-all duration-200"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmStep === "name" ? confirmWs?.workspace.name ?? "" : "DELETE"}
            />

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                className={cardButtonBase(false)}
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
                type="button"
              >
                {confirmStep === "delete" ? "Назад" : "Отмена"}
              </button>

              {confirmStep === "name" ? (
                <button
                  className={primaryButtonBase(!confirmWs || confirmText.trim() !== confirmWs.workspace.name || loading)}
                  disabled={!confirmWs || confirmText.trim() !== confirmWs.workspace.name || loading}
                  onClick={() => {
                    setConfirmStep("delete");
                    setConfirmText("");
                  }}
                  type="button"
                >
                  Продолжить
                </button>
              ) : (
                <button
                  className={[
                    "rounded-xl px-4 py-2 text-sm transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70",
                    confirmText.trim() !== "DELETE" || loading
                      ? "bg-red-100/70 text-red-400 border border-red-200 cursor-not-allowed dark:bg-red-500/10 dark:text-red-300/45 dark:border-red-500/20"
                      : "bg-red-600 text-white border border-red-600 shadow-[0_12px_28px_rgba(220,38,38,0.25)] hover:-translate-y-[1px] hover:bg-red-500 dark:shadow-none dark:hover:bg-red-500",
                  ].join(" ")}
                  disabled={confirmText.trim() !== "DELETE" || loading}
                  onClick={doDeleteWorkspace}
                  type="button"
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