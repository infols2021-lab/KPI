"use client";

import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

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

        <a className="text-sm underline opacity-80" href={`/app/${workspaceId}/year/${year}`}>
          Назад
        </a>
      </div>

      {msg && <div className="mt-4 text-sm">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="font-semibold">Создать проект</div>

          <div className="mt-3 space-y-3">
            <input
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
              placeholder="Название (обязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none min-h-[110px]"
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button
              className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60 dark:bg-white dark:text-black"
              disabled={loading || !name.trim()}
              onClick={create}
            >
              {loading ? "..." : "Создать"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Список проектов</div>
            <button className="text-sm underline" onClick={load} disabled={loading}>
              Обновить
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm opacity-70">Пока нет проектов.</div>
            ) : (
              items.map((p) => (
                <div key={p.id} className="rounded-xl border p-3">
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none font-semibold"
                      value={p.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x))
                        )
                      }
                    />

                    <textarea
                      className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none min-h-[90px]"
                      value={p.description ?? ""}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x))
                        )
                      }
                    />

                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="rounded-xl bg-black text-white px-4 py-2 text-sm dark:bg-white dark:text-black"
                        disabled={loading}
                        onClick={() => save(p)}
                      >
                        Сохранить
                      </button>
                      <button className="text-sm underline" disabled={loading} onClick={() => remove(p.id)}>
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