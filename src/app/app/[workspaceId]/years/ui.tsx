// src/app/app/[workspaceId]/years/ui.tsx
"use client";

import { useEffect, useState } from "react";

type YearItem = { year: number };

type Difficulty = {
  id: string;
  code: string;
  title: string | null;
  points: number;
};

type Quality = {
  id: string;
  code: string;
  title: string;
  coef: number;
};

type DifficultyRow = Difficulty & { pointsInput: string };
type QualityRow = Quality & { coefInput: string };

function normDecimalInput(raw: string) {
  // Разрешаем "1,3" / "1.3" / ".5" / "0,"
  let v = String(raw ?? "");
  // оставляем цифры + . ,
  v = v.replace(/[^\d.,]/g, "");
  // если есть и , и . -> оставим только первый разделитель (какой встретился раньше)
  const comma = v.indexOf(",");
  const dot = v.indexOf(".");
  let sep = -1;
  if (comma !== -1 && dot !== -1) sep = Math.min(comma, dot);
  else sep = comma !== -1 ? comma : dot;

  if (sep !== -1) {
    const before = v.slice(0, sep);
    const after = v.slice(sep + 1).replace(/[.,]/g, "");
    const chosen = v[sep]; // "," или "."
    v = before + chosen + after;
  } else {
    v = v.replace(/[.,]/g, "");
  }

  if (v.length > 24) v = v.slice(0, 24);
  return v;
}

function parseDecimal(input: string): number | null {
  const s = String(input ?? "").trim().replace(",", ".");
  if (!s) return null;
  // разрешим ".5"
  const normalized = s.startsWith(".") ? `0${s}` : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Non-JSON response (${res.status}). ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`);
  return json;
}

export default function YearsClient({ workspaceId }: { workspaceId: string }) {
  const [years, setYears] = useState<YearItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [pointPrice, setPointPrice] = useState<string>("200");

  const [difficulties, setDifficulties] = useState<DifficultyRow[]>([]);
  const [qualities, setQualities] = useState<QualityRow[]>([]);

  const [msg, setMsg] = useState<string | null>(null);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);

  async function loadYears() {
    setLoadingYears(true);
    setMsg(null);
    try {
      const json = await fetchJson(`/api/workspaces/years?workspaceId=${workspaceId}`);
      const list: YearItem[] = json.data ?? [];
      setYears(list);

      if (!selectedYear && (list?.length ?? 0) > 0) {
        // по умолчанию последний год (обычно самый новый)
        const last = list.slice().sort((a, b) => a.year - b.year)[list.length - 1];
        setSelectedYear(last.year);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoadingYears(false);
    }
  }

  async function loadYearConfig(y: number) {
    setLoadingRight(true);
    setMsg(null);
    try {
      const json = await fetchJson(`/api/workspaces/year-config?workspaceId=${workspaceId}&year=${y}`);

      setPointPrice(normDecimalInput(String(json.data.point_price ?? 200)));

      const diffs: Difficulty[] = json.data.difficulties ?? [];
      const quals: Quality[] = json.data.qualities ?? [];

      setDifficulties(
        diffs.map((d) => ({
          ...d,
          pointsInput: normDecimalInput(String(d.points ?? "")),
        }))
      );

      setQualities(
        quals.map((q) => ({
          ...q,
          coefInput: normDecimalInput(String(q.coef ?? "")),
        }))
      );
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoadingRight(false);
    }
  }

  async function createYear() {
    const input = prompt("Какой год создать? (например 2026)");
    if (!input) return;
    const y = Number(String(input).trim());
    if (!Number.isFinite(y) || y < 2000 || y > 3000) {
      setMsg("Год должен быть числом 2000-3000");
      return;
    }

    setMsg(null);
    try {
      const json = await fetchJson(`/api/workspaces/init-year?workspaceId=${workspaceId}&year=${y}`, { method: "POST" });
      await loadYears();
      setSelectedYear(y);
      await loadYearConfig(y);
      setMsg(`Год ${y} создан ✅ (12 месяцев + настройки)`);
      return json;
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    }
  }

  async function savePointPrice() {
    if (selectedYear == null) return;

    const val = parseDecimal(pointPrice);
    if (val == null || val < 0) return setMsg("Цена должна быть числом >= 0 (можно 1,3)");

    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/year-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ шлём оба поля, чтобы не упасть из-за несовпадения названий на сервере
        body: JSON.stringify({ workspaceId, year: selectedYear, point_price: val, pointPrice: val }),
      });
      setPointPrice(normDecimalInput(String(val)));
      setMsg("Цена балла сохранена ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed");
    }
  }

  async function addDifficulty() {
    if (selectedYear == null) return;
    setMsg(null);
    try {
      const json = await fetchJson(`/api/workspaces/year-difficulties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, year: selectedYear, code: "NEW", points: 1 }),
      });

      const d: Difficulty = json.data;
      setDifficulties((p) => [{ ...d, pointsInput: normDecimalInput(String(d.points ?? "")) }, ...p]);
    } catch (e: any) {
      setMsg(e?.message ?? "Create difficulty failed");
    }
  }

  async function updateDifficulty(id: string, patch: Partial<Difficulty>) {
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/year-difficulties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (e: any) {
      setMsg(e?.message ?? "Update difficulty failed");
    }
  }

  async function deleteDifficulty(id: string) {
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/year-difficulties?id=${id}`, { method: "DELETE" });
      setDifficulties((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      setMsg(e?.message ?? "Delete difficulty failed");
    }
  }

  async function addQuality() {
    if (selectedYear == null) return;
    setMsg(null);
    try {
      const json = await fetchJson(`/api/workspaces/year-qualities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, year: selectedYear, code: "QNEW", title: "Новый", coef: 1 }),
      });

      const q: Quality = json.data;
      setQualities((p) => [{ ...q, coefInput: normDecimalInput(String(q.coef ?? "")) }, ...p]);
    } catch (e: any) {
      setMsg(e?.message ?? "Create quality failed");
    }
  }

  async function updateQuality(id: string, patch: Partial<Quality>) {
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/year-qualities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
    } catch (e: any) {
      setMsg(e?.message ?? "Update quality failed");
    }
  }

  async function deleteQuality(id: string) {
    setMsg(null);
    try {
      await fetchJson(`/api/workspaces/year-qualities?id=${id}`, { method: "DELETE" });
      setQualities((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      setMsg(e?.message ?? "Delete quality failed");
    }
  }

  useEffect(() => {
    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedYear != null) loadYearConfig(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* LEFT */}
      <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Годы</div>
          <button className="text-sm underline" onClick={createYear}>
            Создать год
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {loadingYears ? (
            <div className="text-sm opacity-70">Загрузка...</div>
          ) : years.length === 0 ? (
            <div className="text-sm opacity-70">Пока нет годов. Нажми “Создать год”.</div>
          ) : (
            years
              .slice()
              .sort((a, b) => b.year - a.year)
              .map((y) => (
                <button
                  key={y.year}
                  onClick={() => setSelectedYear(y.year)}
                  className={`w-full text-left rounded-xl border px-3 py-2 ${
                    selectedYear === y.year ? "bg-black text-white dark:bg-white dark:text-black" : ""
                  }`}
                >
                  {y.year}
                </button>
              ))
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="rounded-2xl border bg-[rgb(var(--card))] p-4">
        {selectedYear == null ? (
          <div className="text-sm opacity-70">Выбери год слева или создай новый.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-70">Настройки года</div>
                <div className="text-xl font-semibold">{selectedYear}</div>
              </div>
              <a className="text-sm underline" href={`/app/${workspaceId}/year/${selectedYear}/1`}>
                Открыть январь
              </a>
            </div>

            {msg && <div className="mt-3 text-sm">{msg}</div>}

            {loadingRight ? (
              <div className="mt-4 text-sm opacity-70">Загрузка настроек...</div>
            ) : (
              <>
                {/* Point price */}
                <div className="mt-4 rounded-xl border p-3">
                  <div className="font-semibold">Цена балла</div>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <div>
                      <div className="text-sm opacity-70">₽ за 1 балл</div>
                      <input
                        className="rounded-xl border px-3 py-2 w-40 bg-transparent outline-none"
                        inputMode="decimal"
                        value={pointPrice}
                        onChange={(e) => setPointPrice(normDecimalInput(e.target.value))}
                        onBlur={() => {
                          // просто приведём к красивому виду, но не сохраняем автоматически
                          const n = parseDecimal(pointPrice);
                          if (n != null) setPointPrice(normDecimalInput(String(n)));
                        }}
                      />
                    </div>
                    <button
                      className="rounded-xl bg-black text-white px-4 py-2 dark:bg-white dark:text-black"
                      onClick={savePointPrice}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>

                {/* Difficulties */}
                <div className="mt-4 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Сложности</div>
                    <button className="text-sm underline" onClick={addDifficulty}>
                      Добавить
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {difficulties.map((d) => (
                      <div key={d.id} className="rounded-xl border p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[120px_140px_1fr_auto] gap-2 items-end">
                          <div>
                            <div className="text-xs opacity-70">Код</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              value={d.code}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDifficulties((p) => p.map((x) => (x.id === d.id ? { ...x, code: v } : x)));
                              }}
                              onBlur={() => updateDifficulty(d.id, { code: d.code })}
                            />
                          </div>

                          <div>
                            <div className="text-xs opacity-70">Баллы</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              inputMode="decimal"
                              value={d.pointsInput}
                              onChange={(e) => {
                                const v = normDecimalInput(e.target.value);
                                setDifficulties((p) => p.map((x) => (x.id === d.id ? { ...x, pointsInput: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseDecimal(d.pointsInput);
                                if (n == null) {
                                  setMsg("Баллы должны быть числом (можно 1,3)");
                                  return;
                                }
                                setDifficulties((p) =>
                                  p.map((x) => (x.id === d.id ? { ...x, points: n, pointsInput: normDecimalInput(String(n)) } : x))
                                );
                                updateDifficulty(d.id, { points: n });
                              }}
                              placeholder="1,3"
                            />
                          </div>

                          <div>
                            <div className="text-xs opacity-70">Название (необязательно)</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              value={d.title ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDifficulties((p) => p.map((x) => (x.id === d.id ? { ...x, title: v } : x)));
                              }}
                              onBlur={() => updateDifficulty(d.id, { title: d.title })}
                            />
                          </div>

                          <button className="text-sm underline" onClick={() => deleteDifficulty(d.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qualities */}
                <div className="mt-4 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Качество</div>
                    <button className="text-sm underline" onClick={addQuality}>
                      Добавить
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {qualities.map((q) => (
                      <div key={q.id} className="rounded-xl border p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-[120px_180px_140px_auto] gap-2 items-end">
                          <div>
                            <div className="text-xs opacity-70">Код</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              value={q.code}
                              onChange={(e) => {
                                const v = e.target.value;
                                setQualities((p) => p.map((x) => (x.id === q.id ? { ...x, code: v } : x)));
                              }}
                              onBlur={() => updateQuality(q.id, { code: q.code })}
                            />
                          </div>

                          <div>
                            <div className="text-xs opacity-70">Название</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              value={q.title}
                              onChange={(e) => {
                                const v = e.target.value;
                                setQualities((p) => p.map((x) => (x.id === q.id ? { ...x, title: v } : x)));
                              }}
                              onBlur={() => updateQuality(q.id, { title: q.title })}
                            />
                          </div>

                          <div>
                            <div className="text-xs opacity-70">Коэф</div>
                            <input
                              className="w-full rounded-xl border px-2 py-2 bg-transparent outline-none"
                              inputMode="decimal"
                              value={q.coefInput}
                              onChange={(e) => {
                                const v = normDecimalInput(e.target.value);
                                setQualities((p) => p.map((x) => (x.id === q.id ? { ...x, coefInput: v } : x)));
                              }}
                              onBlur={() => {
                                const n = parseDecimal(q.coefInput);
                                if (n == null) {
                                  setMsg("Коэф должен быть числом (можно 1,3)");
                                  return;
                                }
                                setQualities((p) =>
                                  p.map((x) => (x.id === q.id ? { ...x, coef: n, coefInput: normDecimalInput(String(n)) } : x))
                                );
                                updateQuality(q.id, { coef: n });
                              }}
                              placeholder="1,3"
                            />
                          </div>

                          <button className="text-sm underline" onClick={() => deleteQuality(q.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}