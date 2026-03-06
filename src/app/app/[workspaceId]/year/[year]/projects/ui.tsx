// src/app/app/[workspaceId]/year/[year]/projects/ui.tsx
"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

function softButtonClass() {
  return [
    "rounded-xl px-3 py-2 text-sm transition-all duration-200",
    "border border-[rgb(var(--border))]",
    "bg-white/90 text-[rgb(var(--fg))]",
    "hover:-translate-y-[1px] hover:bg-sky-50 hover:border-sky-300/70 hover:shadow-[0_10px_24px_rgba(56,189,248,0.14)]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
    "dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))] dark:hover:shadow-none",
  ].join(" ");
}

function primaryButtonClass(disabled = false, full = false) {
  return [
    full ? "w-full" : "",
    "rounded-xl px-4 py-2 font-medium transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
    disabled
      ? "bg-slate-200 text-slate-500 border border-slate-200 cursor-not-allowed dark:bg-white/15 dark:text-white/45 dark:border-white/10"
      : "bg-sky-100 text-sky-950 border border-sky-200 shadow-[0_10px_24px_rgba(56,189,248,0.18)] hover:-translate-y-[1px] hover:bg-sky-200 hover:shadow-[0_14px_30px_rgba(56,189,248,0.24)] dark:bg-white dark:text-black dark:border-white dark:shadow-none dark:hover:bg-white/90 dark:hover:shadow-none",
  ]
    .filter(Boolean)
    .join(" ");
}

function inputClass(extra?: string) {
  return [
    "w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-all duration-200",
    "hover:border-sky-300/70",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function ProjectsClient({ workspaceId, year }: { workspaceId: string; year: number }) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/workspaces/projects?workspaceId=${workspaceId}&year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load projects");
      setItems(json.data ?? []);
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    const n = name.trim();
    if (!n) return setMsg("Название проекта обязательно");

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/workspaces/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          year,
          name: n,
          description: description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Create failed");

      setName("");
      setDescription("");
      setItems((p) => [json.data, ...p]);
      setMsg("Проект создан ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function save(p: Project) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/workspaces/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          year,
          id: p.id,
          name: p.name,
          description: p.description ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");
      setMsg("Сохранено ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить проект?")) return;

    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/workspaces/projects?id=${id}&workspaceId=${workspaceId}&year=${year}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Delete failed");
      setItems((p) => p.filter((x) => x.id !== id));
      setMsg("Удалено ✅");
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
    <div className="max-w-4xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs opacity-70">Настройки проекта</div>
          <h1 className="text-2xl font-semibold">Проекты • {year}</h1>
          <div className="text-sm opacity-70 mt-1">
            Проект привязан к году. Потом карточки будут обязаны выбирать проект этого же года.
          </div>
        </div>

        <a className={softButtonClass()} href={`/app/${workspaceId}/year/${year}`}>
          Назад
        </a>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="font-semibold">Создать проект</div>

          <div className="mt-3 space-y-3">
            <input
              className={inputClass()}
              placeholder="Название (обязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className={inputClass("min-h-[110px] resize-y")}
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              className={primaryButtonClass(loading || !name.trim(), true)}
              disabled={loading || !name.trim()}
              onClick={create}
            >
              {loading ? "..." : "Создать"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Список проектов</div>
            <button className={softButtonClass()} onClick={load} disabled={loading}>
              Обновить
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm opacity-70">Пока нет проектов.</div>
            ) : (
              items.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_28px_rgba(56,189,248,0.12)] dark:hover:shadow-none"
                >
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      className={inputClass("font-semibold")}
                      value={p.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                    />

                    <textarea
                      className={inputClass("min-h-[90px] resize-y")}
                      value={p.description ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x))
                        )
                      }
                    />

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        className={primaryButtonClass(loading, false)}
                        disabled={loading}
                        onClick={() => save(p)}
                      >
                        Сохранить
                      </button>
                      <button className={softButtonClass()} disabled={loading} onClick={() => remove(p.id)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}