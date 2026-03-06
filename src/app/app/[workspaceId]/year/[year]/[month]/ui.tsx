// src/app/app/[workspaceId]/year/[year]/[month]/ui.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import BlockingOverlay from "@/components/BlockingOverlay";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Column = {
  id: string;
  title: string;
  position: number;
  system_key: "done" | "accepted" | null;
  is_locked: boolean;
};

type Card = {
  id: string;
  title: string;
  column_id: string;
  position: number;
  timer_total_seconds: number;
  timer_running: boolean;
  deadline: string | null;
  project_id: string;
  difficulty_id: string | null;
  quality_level_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  accepted_at?: string | null;
};

type Project = { id: string; name: string; description: string | null };
type Difficulty = { id: string; code: string; points: number };
type Quality = { id: string; code: string; title: string; coef: number };

type CardAttachment = {
  id: string;
  card_id: string;
  bucket: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  is_cover: boolean;
  created_at: string;
};

type CardComment = { id: string; author_user_id: string; body: string; created_at: string };

type CommentAttachment = {
  id: string;
  comment_id: string;
  bucket: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type ChecklistItem = {
  id: string;
  block_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
};

type BlockType = "text" | "checklist" | "link" | "attachment";

type CardBlock = {
  id: string;
  type: BlockType;
  position: number;
  payload: any;
  items?: ChecklistItem[];
  attachment?: CardAttachment | null;
  created_at?: string;
  updated_at?: string;
};

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

/* =======================
   UI helpers
======================= */

function softButtonClass(extra = "") {
  return [
    "rounded-xl border px-3 py-2 text-sm transition-all duration-200",
    "border-[rgb(var(--border))] text-[rgb(var(--fg))]",
    "bg-white/90 hover:bg-sky-50 hover:border-sky-300/70 hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(56,189,248,0.14)]",
    "dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-none",
    "disabled:opacity-60 disabled:transform-none disabled:shadow-none",
    extra,
  ].join(" ");
}

function iconButtonClass(extra = "") {
  return [
    "rounded-lg border px-2 py-1 text-xs transition-all duration-200",
    "border-[rgb(var(--border))] text-[rgb(var(--fg))]",
    "bg-white/90 hover:bg-sky-50 hover:border-sky-300/70 hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(56,189,248,0.14)]",
    "dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-none",
    "disabled:opacity-60 disabled:transform-none disabled:shadow-none",
    extra,
  ].join(" ");
}

function primaryButtonClass(extra = "", disabled = false) {
  return [
    "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
    disabled
      ? "border border-slate-200 bg-slate-200 text-slate-500 dark:border-white/10 dark:bg-white/15 dark:text-white/45"
      : "border border-sky-200 bg-sky-100 text-sky-950 shadow-[0_10px_24px_rgba(56,189,248,0.18)] hover:bg-sky-200 hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(56,189,248,0.24)] dark:border-white dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-white/90 dark:hover:shadow-none",
    extra,
  ].join(" ");
}

function dangerButtonClass(extra = "", disabled = false) {
  return [
    "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
    disabled
      ? "border border-slate-200 bg-slate-200 text-slate-500 dark:border-white/10 dark:bg-white/15 dark:text-white/45"
      : "border border-red-200 bg-red-50 text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.10)] hover:bg-red-100 hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(239,68,68,0.16)] dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-200 dark:shadow-none dark:hover:bg-red-500/20",
    extra,
  ].join(" ");
}

function inputClass(extra = "") {
  return [
    "w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-all duration-200",
    "border-[rgb(var(--border))] text-[rgb(var(--fg))]",
    "hover:border-sky-300/70 focus:border-sky-400/70",
    "text-[rgb(var(--fg))] dark:text-white",
    extra,
  ].join(" ");
}

function cardSurfaceClass(extra = "") {
  return [
    "rounded-2xl border bg-[rgb(var(--card))] transition-all duration-200",
    "hover:shadow-[0_14px_30px_rgba(56,189,248,0.10)]",
    "dark:hover:shadow-none",
    extra,
  ].join(" ");
}

/* ===== СИЛЬНО УСИЛЕНА ЧИТАЕМОСТЬ КАРТОЧЕК В LIGHT ===== */
function laneCardClass(extra = "") {
  return [
    "rounded-xl border p-3 transition-all duration-200",
    "border-sky-200/95 ring-1 ring-white/80",
    "bg-[rgba(255,255,255,0.98)] text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.06)]",
    "hover:bg-sky-50 hover:border-sky-300 hover:-translate-y-[1px] hover:shadow-[0_16px_30px_rgba(56,189,248,0.18)]",
    "dark:border-[rgb(var(--border))] dark:ring-0 dark:bg-[rgb(var(--card))] dark:text-white dark:shadow-none dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-none",
    extra,
  ].join(" ");
}

function laneTitleClass(extra = "") {
  return ["text-slate-950 dark:text-white", extra].join(" ");
}

function laneMetaClass(extra = "") {
  return ["text-slate-800 dark:text-white/85", extra].join(" ");
}

function laneMutedClass(extra = "") {
  return ["text-slate-700 dark:text-white/70", extra].join(" ");
}

function chipClass(extra = "") {
  return [
    "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
    "border-sky-300 bg-sky-50 text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
    "dark:border-[rgb(var(--border))] dark:bg-white/5 dark:text-white dark:shadow-none",
    extra,
  ].join(" ");
}

function mutedTextClass(extra = "") {
  return ["text-[rgb(var(--fg))] opacity-70 dark:text-white/70", extra].join(" ");
}

function strongTextClass(extra = "") {
  return ["text-[rgb(var(--fg))] dark:text-white", extra].join(" ");
}

function badgeClass(extra = "") {
  return [
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[rgb(var(--fg))] dark:text-white",
    "border-[rgb(var(--border))] bg-white/80 dark:bg-white/5",
    extra,
  ].join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtMoscowDateTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  try {
    const s = new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(t));
    return s.replace(",", "");
  } catch {
    return new Date(t).toLocaleString("ru-RU");
  }
}

function isoToLocalInputValue(iso: string) {
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

function localInputValueToIso(value: string): string | null {
  const s = String(value || "").trim();
  if (!s) return null;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);

  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;

  return d.toISOString();
}

function fmtSeconds(s: number) {
  const ss = Math.max(0, Math.floor(s));
  const h = Math.floor(ss / 3600);
  const m = Math.floor((ss % 3600) / 60);
  const sec = ss % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtTimeLeft(deadlineIso: string) {
  const now = Date.now();
  const t = new Date(deadlineIso).getTime();
  if (!Number.isFinite(t)) return { text: "дедлайн", tone: "muted" as const };

  const diff = t - now;
  const abs = Math.abs(diff);

  const mins = Math.floor(abs / 60000) % 60;
  const hours = Math.floor(abs / 3600000) % 24;
  const days = Math.floor(abs / 86400000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0 || days > 0) parts.push(`${hours}ч`);
  parts.push(`${mins}м`);

  if (diff < 0) return { text: `просрочено ${parts.join(" ")}`, tone: "danger" as const };
  if (diff <= 6 * 3600 * 1000) return { text: `осталось ${parts.join(" ")}`, tone: "warn" as const };
  return { text: `осталось ${parts.join(" ")}`, tone: "muted" as const };
}

function fmtDeltaParts(absMs: number) {
  const abs = Math.max(0, Math.floor(absMs));
  const mins = Math.floor(abs / 60000) % 60;
  const hours = Math.floor(abs / 3600000) % 24;
  const days = Math.floor(abs / 86400000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0 || days > 0) parts.push(`${hours}ч`);
  parts.push(`${mins}м`);
  return parts.join(" ");
}

function fmtDoneVsDeadline(deadlineIso: string, doneIso: string) {
  const d = new Date(deadlineIso).getTime();
  const done = new Date(doneIso).getTime();
  if (!Number.isFinite(d) || !Number.isFinite(done)) return { text: "дедлайн", tone: "muted" as const };

  const delta = done - d;
  const absText = fmtDeltaParts(Math.abs(delta));
  if (delta > 0) return { text: `сдано: +${absText}`, tone: "danger" as const };
  if (delta < 0) return { text: `сдано: -${absText}`, tone: "success" as const };
  return { text: "сдано: ровно в дедлайн", tone: "muted" as const };
}

function safeFileName(original: string) {
  const raw = String(original || "file").trim();
  const dot = raw.lastIndexOf(".");
  const extRaw = dot > 0 ? raw.slice(dot + 1) : "";
  const baseRaw = dot > 0 ? raw.slice(0, dot) : raw;

  const ext = extRaw
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
    .slice(0, 12);

  const base = baseRaw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  const finalBase = base || "file";
  return ext ? `${finalBase}.${ext}` : finalBase;
}

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

type OverlayState =
  | { open: false }
  | { open: true; mode: "loading"; title: string; message?: string }
  | { open: true; mode: "error"; title: string; message: string; retry?: () => void };

function normColumn(row: any): Column {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    position: Number(row.position ?? 0),
    system_key: (row.system_key as any) ?? null,
    is_locked: !!row.is_locked,
  };
}

function normCard(row: any): Card {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    column_id: String(row.column_id),
    position: Number(row.position ?? 0),
    timer_total_seconds: Number(row.timer_total_seconds ?? 0),
    timer_running: !!row.timer_running,
    deadline: row.deadline ? String(row.deadline) : null,
    project_id: String(row.project_id ?? ""),
    difficulty_id: row.difficulty_id ? String(row.difficulty_id) : null,
    quality_level_id: row.quality_level_id ? String(row.quality_level_id) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    accepted_at: row.accepted_at ? String(row.accepted_at) : null,
  };
}

function dedupeCardsById(list: Card[]): Card[] {
  const idsInOrder: string[] = [];
  const map = new Map<string, Card>();
  for (const c of list) {
    const id = String((c as any)?.id ?? "");
    if (!id) continue;
    if (!map.has(id)) idsInOrder.push(id);
    map.set(id, c);
  }
  return idsInOrder.map((id) => map.get(id)!).filter(Boolean);
}

export default function MonthView(props: {
  workspaceId: string;
  year: number;
  month: number;
  boardId: string;
  pointPrice: number;
  columns: Column[];
  cards: Card[];
  projects: Project[];
  difficulties: Difficulty[];
  qualities: Quality[];
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [columns, setColumns] = useState<Column[]>(props.columns);
  const [cards, setCards] = useState<Card[]>(dedupeCardsById((props.cards ?? []).map(normCard)));

  const [overlay, setOverlay] = useState<OverlayState>({ open: false });

  function showLoading(title: string, message?: string) {
    setOverlay({ open: true, mode: "loading", title, message });
  }
  function showError(title: string, message: string, retry?: () => void) {
    setOverlay({ open: true, mode: "error", title, message, retry });
  }
  function closeError() {
    setOverlay({ open: false });
  }

  const lanesRef = useRef<HTMLDivElement | null>(null);
  function keepScrollX<T>(fn: () => T): T {
    const x = lanesRef.current?.scrollLeft ?? 0;
    const out = fn();
    window.setTimeout(() => {
      if (lanesRef.current) lanesRef.current.scrollLeft = x;
    }, 0);
    return out;
  }

  useEffect(() => {
    const ch = supabase
      .channel(`rt-board:${props.boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${props.boardId}` },
        (payload: any) => {
          const t = payload.eventType;

          if (t === "INSERT") {
            const c = normCard(payload.new);
            keepScrollX(() =>
              setCards((prev) => {
                if (prev.some((x) => x.id === c.id)) return prev;
                return dedupeCardsById([...prev, c]);
              })
            );
          } else if (t === "UPDATE") {
            const c = normCard(payload.new);
            keepScrollX(() =>
              setCards((prev) => {
                const next = prev.map((x) => (x.id === c.id ? { ...x, ...c } : x));
                return dedupeCardsById(next);
              })
            );
          } else if (t === "DELETE") {
            const id = String(payload.old?.id ?? "");
            if (!id) return;
            keepScrollX(() => setCards((prev) => prev.filter((x) => x.id !== id)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_columns", filter: `board_id=eq.${props.boardId}` },
        (payload: any) => {
          const t = payload.eventType;

          if (t === "INSERT") {
            const c = normColumn(payload.new);
            keepScrollX(() => setColumns((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c])));
          } else if (t === "UPDATE") {
            const c = normColumn(payload.new);
            keepScrollX(() =>
              setColumns((prev) => {
                const next = prev.map((x) => (x.id === c.id ? { ...x, ...c } : x));
                return next.slice().sort((a, b) => a.position - b.position);
              })
            );
          } else if (t === "DELETE") {
            const id = String(payload.old?.id ?? "");
            if (!id) return;
            keepScrollX(() => {
              setColumns((prev) => prev.filter((x) => x.id !== id));
              setCards((prev) => prev.filter((x) => x.column_id !== id));
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, props.boardId]);

  const diffMap = useMemo(() => Object.fromEntries(props.difficulties.map((d) => [d.id, d])), [props.difficulties]);
  const qualMap = useMemo(() => Object.fromEntries(props.qualities.map((q) => [q.id, q])), [props.qualities]);
  const projectMap = useMemo(() => Object.fromEntries(props.projects.map((p) => [p.id, p])), [props.projects]);

  const acceptedColumnIds = useMemo(
    () => new Set(columns.filter((c) => c.system_key === "accepted").map((c) => c.id)),
    [columns]
  );

  const freezeColumnIds = useMemo(
    () => new Set(columns.filter((c) => c.system_key === "accepted" || c.system_key === "done").map((c) => c.id)),
    [columns]
  );

  const stats = useMemo(() => {
    const totalTasks = cards.length;
    const acceptedCards = cards.filter((c) => acceptedColumnIds.has(c.column_id));
    const totalPoints = acceptedCards.reduce((s, c) => s + Number(diffMap[c.difficulty_id ?? ""]?.points ?? 0), 0);
    const avgQuality =
      acceptedCards.length > 0
        ? acceptedCards.reduce((s, c) => s + Number(qualMap[c.quality_level_id ?? ""]?.coef ?? 0), 0) /
          acceptedCards.length
        : 0;
    const salary = Math.round(avgQuality * totalPoints * props.pointPrice * 100) / 100;
    return { totalTasks, totalPoints, avgQuality, salary };
  }, [cards, acceptedColumnIds, diffMap, qualMap, props.pointPrice]);

  const [colMenu, setColMenu] = useState<null | { colId: string; x: number; y: number }>(null);

  function openColumnMenu(colId: string, btn: HTMLButtonElement) {
    const rect = btn.getBoundingClientRect();
    const menuW = 180;
    const menuH = 170;

    let x = rect.right - menuW;
    x = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));

    let y = rect.bottom + 8;
    if (y + menuH > window.innerHeight - 8) y = rect.top - menuH - 8;
    y = Math.max(8, y);

    setColMenu({ colId, x, y });
  }

  async function createColumn() {
    const title = prompt("Название дорожки:");
    if (!title) return;

    showLoading("Создаю дорожку", "Пожалуйста, подожди...");
    try {
      const json = await fetchJson("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: props.workspaceId, boardId: props.boardId, title }),
      });
      keepScrollX(() => setColumns((p) => [...p, normColumn(json.data)].sort((a, b) => a.position - b.position)));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось создать дорожку", String(e?.message ?? e), createColumn);
    }
  }

  async function renameColumn(col: Column) {
    const title = prompt("Новое название:", col.title);
    if (!title) return;

    showLoading("Переименовываю", "Пожалуйста, подожди...");
    try {
      await fetchJson("/api/columns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: col.id, title }),
      });
      keepScrollX(() => setColumns((p) => p.map((c) => (c.id === col.id ? { ...c, title } : c))));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось переименовать", String(e?.message ?? e), () => renameColumn(col));
    }
  }

  async function deleteColumn(col: Column) {
    if (!confirm(`Удалить дорожку "${col.title}"? Карточки внутри тоже удалятся.`)) return;

    showLoading("Удаляю дорожку", "Пожалуйста, подожди...");
    try {
      await fetchJson(`/api/columns?id=${col.id}`, { method: "DELETE" });

      keepScrollX(() => {
        setColumns((p) => p.filter((c) => c.id !== col.id));
        setCards((p) => p.filter((x) => x.column_id !== col.id));
      });

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось удалить дорожку", String(e?.message ?? e), () => deleteColumn(col));
    }
  }

  async function moveColumn(col: Column, direction: "left" | "right") {
    showLoading("Перемещаю дорожку", "Пожалуйста, подожди...");
    try {
      await fetchJson("/api/columns/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: col.id, direction }),
      });

      const { data, error } = await supabase
        .from("board_columns")
        .select("id, title, position, system_key, is_locked")
        .eq("board_id", props.boardId)
        .order("position", { ascending: true });

      if (error) throw new Error(error.message);

      keepScrollX(() => setColumns((data ?? []).map(normColumn)));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось переместить дорожку", String(e?.message ?? e), () => moveColumn(col, direction));
    }
  }

  async function moveCardOneStep(card: Card, direction: "up" | "down") {
    showLoading("Перемещаю карточку", "Пожалуйста, подожди...");
    try {
      const json = await fetchJson("/api/cards/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, direction }),
      });

      const swappedWith = String(json?.swappedWith ?? "");
      if (!swappedWith) {
        setOverlay({ open: false });
        return;
      }

      keepScrollX(() =>
        setCards((prev) => {
          const a = prev.find((x) => x.id === card.id);
          const b = prev.find((x) => x.id === swappedWith);
          if (!a || !b) return prev;

          const aPos = a.position;
          const bPos = b.position;

          const next = prev.map((x) =>
            x.id === a.id ? { ...x, position: bPos } : x.id === b.id ? { ...x, position: aPos } : x
          );

          return dedupeCardsById(next);
        })
      );

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось переместить карточку", String(e?.message ?? e), () => moveCardOneStep(card, direction));
    }
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);

  function openExistingCard(id: string) {
    setCreatingColumnId(null);
    setEditingCardId(id);
    setModalOpen(true);
  }

  function openCreateCard(columnId: string) {
    setEditingCardId(null);
    setCreatingColumnId(columnId);
    setModalOpen(true);
  }

  function onCardCreated(newCard: Card) {
    const c = normCard(newCard as any);
    keepScrollX(() =>
      setCards((p) => {
        if (p.some((x) => x.id === c.id)) return p;
        return dedupeCardsById([...p, c]);
      })
    );
  }

  function onCardUpdated(patch: Partial<Card> & { id: string }) {
    keepScrollX(() =>
      setCards((prev) => {
        const next = prev.map((c) => (c.id === patch.id ? ({ ...c, ...patch } as any) : c));
        return dedupeCardsById(next);
      })
    );
  }

  function onCardDeleted(id: string) {
    keepScrollX(() => setCards((p) => p.filter((c) => c.id !== id)));
  }

  const sortedColumns = useMemo(() => columns.slice().sort((a, b) => a.position - b.position), [columns]);

  return (
    <div className="min-w-0">
      <div className={cardSurfaceClass("p-4")}>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className={mutedTextClass("text-xs")}>Месяц</div>
            <h1 className={strongTextClass("text-2xl font-semibold")}>
              {MONTHS[props.month - 1]} {props.year}
            </h1>
          </div>
          <a className={softButtonClass()} href={`/app/${props.workspaceId}/years`}>
            Настройки года
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Всего задач" value={stats.totalTasks} />
          <Stat label="Баллы (принято)" value={stats.totalPoints.toFixed(2)} />
          <Stat label="Среднее качество" value={stats.avgQuality.toFixed(2)} />
          <Stat label="ЗП за месяц" value={`${stats.salary} ₽`} />
        </div>
      </div>

      <div ref={lanesRef} className="mt-6 flex gap-4 overflow-x-auto overscroll-x-contain pb-4">
        <div className="min-w-[220px]">
          <button className={softButtonClass("w-full rounded-2xl p-3")} onClick={createColumn}>
            + Дорожка
          </button>
        </div>

        {sortedColumns.map((col) => {
          const colCards = cards
            .filter((c) => c.column_id === col.id)
            .slice()
            .sort((a, b) => a.position - b.position);

          return (
            <div key={col.id} className={cardSurfaceClass("min-w-[320px] p-3")}>
              <div className="flex items-center justify-between gap-2">
                <div className={strongTextClass("font-semibold")}>{col.title}</div>

                <div className="flex items-center gap-2">
                  <button className={softButtonClass("px-2 py-1")} onClick={() => openCreateCard(col.id)}>
                    + карточка
                  </button>

                  {!col.system_key && (
                    <button
                      className={softButtonClass("px-2 py-1")}
                      onClick={(e) => openColumnMenu(col.id, e.currentTarget)}
                      title="Настройки дорожки"
                    >
                      ⋯
                    </button>
                  )}

                  {col.system_key && <span className={badgeClass("text-xs")}>{col.system_key}</span>}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {colCards.length === 0 ? (
                  <div className={mutedTextClass("text-sm opacity-60")}>Пока пусто.</div>
                ) : (
                  colCards.map((c) => {
                    const diff = diffMap[c.difficulty_id ?? ""];
                    const proj = projectMap[c.project_id ?? ""];
                    const showTimer = c.timer_running || c.timer_total_seconds > 0;

                    const isFreezeLane = freezeColumnIds.has(c.column_id);
                    const doneIso = c.accepted_at || c.updated_at || null;

                    const deadlineBadge =
                      c.deadline && isFreezeLane && doneIso
                        ? fmtDoneVsDeadline(c.deadline, doneIso)
                        : c.deadline
                        ? fmtTimeLeft(c.deadline)
                        : null;

                    const createdLine = c.created_at ? fmtMoscowDateTime(c.created_at) : "";

                    return (
                      <div key={c.id} className={laneCardClass()}>
                        <button className="w-full text-left" onClick={() => openExistingCard(c.id)}>
                          <div className={laneTitleClass("font-semibold text-[18px] leading-[1.35]")}>{c.title}</div>

                          <div className="mt-3 space-y-2 text-xs">
                            {!!proj?.name && (
                              <div className="min-w-0">
                                <span
                                  className={chipClass("inline-flex max-w-full items-center gap-1")}
                                  title={proj.name}
                                >
                                  <span className="shrink-0">📁</span>
                                  <span className="min-w-0 truncate">{proj.name}</span>
                                </span>
                              </div>
                            )}

                            {diff?.code && (
                              <div className="min-w-0">
                                <span className={chipClass("inline-flex max-w-full items-center")}>
                                  Сложн: {diff.code}
                                </span>
                              </div>
                            )}

                            {(deadlineBadge || showTimer) && (
                              <div className="flex flex-wrap gap-2 items-center">
                                {deadlineBadge && (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 font-medium ${
                                      deadlineBadge.tone === "danger"
                                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
                                        : deadlineBadge.tone === "warn"
                                        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                                        : deadlineBadge.tone === "success"
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                                        : "border-sky-300 bg-sky-50 text-slate-800 dark:border-[rgb(var(--border))] dark:bg-white/5 dark:text-white/80"
                                    }`}
                                  >
                                    ⏳ {deadlineBadge.text}
                                  </span>
                                )}

                                {showTimer && <span className={chipClass()}>⏱ {fmtSeconds(c.timer_total_seconds)}</span>}
                              </div>
                            )}

                            {createdLine && <div className={laneMutedClass("text-xs")}>🕒 Создано: {createdLine}</div>}
                          </div>
                        </button>

                        <div className="mt-3 flex justify-end gap-2">
                          <button className={iconButtonClass()} onClick={() => moveCardOneStep(c, "up")}>
                            ↑
                          </button>
                          <button className={iconButtonClass()} onClick={() => moveCardOneStep(c, "down")}>
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {colMenu &&
        (() => {
          const col = columns.find((c) => c.id === colMenu.colId);
          if (!col) return null;

          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setColMenu(null)} />
              <div
                className="fixed z-50 w-[180px] rounded-xl border bg-[rgb(var(--card))] shadow-sm overflow-hidden text-[rgb(var(--fg))] dark:text-white"
                style={{ left: colMenu.x, top: colMenu.y }}
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-sky-50 dark:hover:bg-white/10"
                  onClick={() => {
                    setColMenu(null);
                    renameColumn(col);
                  }}
                >
                  Переименовать
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-sky-50 dark:hover:bg-white/10"
                  onClick={() => {
                    setColMenu(null);
                    moveColumn(col, "left");
                  }}
                >
                  Сдвинуть влево
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-sky-50 dark:hover:bg-white/10"
                  onClick={() => {
                    setColMenu(null);
                    moveColumn(col, "right");
                  }}
                >
                  Сдвинуть вправо
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm transition-all duration-200 hover:bg-red-500/10 text-red-700 dark:text-red-200"
                  onClick={() => {
                    setColMenu(null);
                    deleteColumn(col);
                  }}
                >
                  Удалить
                </button>
              </div>
            </>
          );
        })()}

      <CardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={props.workspaceId}
        boardId={props.boardId}
        columns={columns}
        projects={props.projects}
        difficulties={props.difficulties}
        qualities={props.qualities}
        editingCardId={editingCardId}
        creatingColumnId={creatingColumnId}
        onCreated={onCardCreated}
        onUpdated={onCardUpdated}
        onDeleted={onCardDeleted}
        supabase={supabase}
      />

      <BlockingOverlay
        open={overlay.open}
        mode={overlay.open ? overlay.mode : "loading"}
        title={overlay.open ? (overlay as any).title : undefined}
        message={overlay.open ? (overlay as any).message : undefined}
        onCloseError={overlay.open && overlay.mode === "error" ? closeError : undefined}
        onRetry={overlay.open && overlay.mode === "error" ? (overlay as any).retry : undefined}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className={cardSurfaceClass("rounded-xl p-3")}>
      <div className={mutedTextClass("text-xs")}>{label}</div>
      <div className={strongTextClass("mt-1 text-xl font-semibold")}>{value}</div>
    </div>
  );
}

/* =======================
   Card Modal
======================= */

function CardModal(props: {
  open: boolean;
  onClose: () => void;

  workspaceId: string;
  boardId: string;

  columns: Column[];
  projects: Project[];
  difficulties: Difficulty[];
  qualities: Quality[];

  editingCardId: string | null;
  creatingColumnId: string | null;

  onCreated: (c: any) => void;
  onUpdated: (p: any) => void;
  onDeleted: (id: string) => void;

  supabase: ReturnType<typeof getSupabaseBrowserClient>;
}) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"main" | "files">("main");

  const [cardId, setCardId] = useState<string | null>(null);
  const [columnId, setColumnId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [difficultyId, setDifficultyId] = useState<string>("");
  const [qualityLevelId, setQualityLevelId] = useState<string>("");

  const [deadline, setDeadline] = useState<string>("");
  const [acceptedDoneIso, setAcceptedDoneIso] = useState<string | null>(null);

  const [createdAtIso, setCreatedAtIso] = useState<string | null>(null);

  const [timerTotal, setTimerTotal] = useState<number>(0);

  const [blocks, setBlocks] = useState<CardBlock[]>([]);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);

  const [comments, setComments] = useState<CardComment[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<CommentAttachment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [overlay, setOverlay] = useState<OverlayState>({ open: false });

  function showLoading(title: string, message?: string) {
    setOverlay({ open: true, mode: "loading", title, message });
  }
  function showError(title: string, message: string, retry?: () => void) {
    setOverlay({ open: true, mode: "error", title, message, retry });
  }
  function closeError() {
    setOverlay({ open: false });
  }

  const acceptedColIds = useMemo(
    () => new Set(props.columns.filter((c) => c.system_key === "accepted").map((c) => c.id)),
    [props.columns]
  );
  const freezeColIds = useMemo(
    () => new Set(props.columns.filter((c) => c.system_key === "accepted" || c.system_key === "done").map((c) => c.id)),
    [props.columns]
  );

  const isAccepted = acceptedColIds.has(columnId);
  const isFreezeLane = freezeColIds.has(columnId);

  useEffect(() => {
    if (!isAccepted) {
      if (qualityLevelId) setQualityLevelId("");
      return;
    }
    if (!qualityLevelId) setQualityLevelId(props.qualities[0]?.id ?? "");
  }, [isAccepted, props.qualities, qualityLevelId]);

  const openKeyRef = useRef<string>("");
  const opLockRef = useRef(false);

  function publicUrl(bucket: string, path: string) {
    return props.supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  function humanizeError(raw: string) {
    const s = String(raw || "");
    if (s.includes("Quality is required in Accepted column")) {
      return 'Пожалуйста, выбери качество выполнения. В колонке "Принято" качество обязательно.';
    }
    if (s.includes("Invalid difficulty_id")) return "Сложность не подходит для этого года. Выбери другую.";
    if (s.includes("Invalid quality_level_id")) return "Качество не подходит для этого года. Выбери другое.";
    if (s.includes("Invalid deadline")) return "Дедлайн некорректный. Попробуй выбрать дату заново.";
    if (s.includes("Unauthorized")) return "Сессия истекла. Перезайди и попробуй снова.";
    if (s.includes("Invalid key")) {
      return "Имя файла/путь содержит запрещённые символы. Переименуй файл (латиница) или загрузи заново.";
    }
    return s;
  }

  const overallChecklist = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const b of blocks) {
      if (b.type !== "checklist") continue;
      const items = b.items ?? [];
      total += items.length;
      done += items.filter((x) => x.is_done).length;
    }
    return { done, total };
  }, [blocks]);

  function validateRequired(retry: () => void) {
    if (!title.trim()) {
      showError("Проверь поля", "Пожалуйста, заполни название карточки.", retry);
      return false;
    }
    if (!projectId) {
      showError("Проверь поля", "Пожалуйста, выбери проект.", retry);
      return false;
    }
    if (isAccepted && !qualityLevelId) {
      showError("Проверь поля", 'В колонке "Принято" качество обязательно.', retry);
      return false;
    }
    return true;
  }

  function sortBlocks(a: CardBlock, b: CardBlock) {
    return Number(a.position) - Number(b.position);
  }

  async function ensureLegacyDescriptionAsBlock(card: any, currentBlocks: CardBlock[]) {
    const legacy = String(card?.description ?? "").trim();
    if (!legacy) return false;

    const already = currentBlocks.some((b) => b.type === "text" && b.payload?.legacy === true);
    if (already) return false;

    await fetchJson("/api/cards/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: props.workspaceId,
        cardId: String(card.id),
        type: "text",
        payload: { text: legacy, legacy: true },
      }),
    });

    return true;
  }

  async function deleteAttachmentFully(attachmentId: string, opts?: { skipConfirm?: boolean }) {
    if (!cardId) return;

    const att =
      attachments.find((a) => a.id === attachmentId) ||
      blocks.find((b) => b.type === "attachment" && String(b.payload?.attachmentId ?? "") === attachmentId)?.attachment ||
      null;

    if (!opts?.skipConfirm) {
      const ok = confirm("Удалить это фото? Оно исчезнет из карточки и из списка файлов.");
      if (!ok) return;
    }

    const retry = () => deleteAttachmentFully(attachmentId, { skipConfirm: true });

    showLoading("Удаляю фото", "Пожалуйста, подожди...");
    try {
      const { data: allAttBlocks, error: blkErr } = await props.supabase
        .from("card_blocks")
        .select("id, payload, type")
        .eq("workspace_id", props.workspaceId)
        .eq("card_id", cardId)
        .eq("type", "attachment");

      if (blkErr) throw new Error(blkErr.message);

      const blockIds = (allAttBlocks ?? [])
        .filter((r: any) => String(r?.payload?.attachmentId ?? "") === String(attachmentId))
        .map((r: any) => String(r.id))
        .filter(Boolean);

      for (const bid of blockIds) {
        await fetchJson(`/api/cards/blocks?id=${bid}`, { method: "DELETE" });
      }

      const { error: delDbErr } = await props.supabase
        .from("card_attachments")
        .delete()
        .eq("workspace_id", props.workspaceId)
        .eq("card_id", cardId)
        .eq("id", attachmentId);

      if (delDbErr) throw new Error(delDbErr.message);

      if (att?.bucket && att?.path) {
        const rm = await props.supabase.storage.from(att.bucket).remove([att.path]);
        if (rm.error) {
          // ignore
        }
      }

      setBlocks((prev) =>
        prev.filter((b) => !(b.type === "attachment" && String(b.payload?.attachmentId ?? "") === String(attachmentId)))
      );
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось удалить фото", humanizeError(e?.message ?? e), retry);
    }
  }

  async function cleanupStaleAttachmentBlocks(currentBlocks: CardBlock[]) {
    const stale = currentBlocks
      .filter((b) => b.type === "attachment")
      .filter((b) => String(b.payload?.attachmentId ?? "").trim() && !b.attachment)
      .map((b) => String(b.id))
      .filter(Boolean);

    if (stale.length === 0) return false;

    for (const id of stale) {
      try {
        await fetchJson(`/api/cards/blocks?id=${id}`, { method: "DELETE" });
      } catch {
        // ignore
      }
    }
    return true;
  }

  async function loadDetails(id: string) {
    showLoading("Открываем карточку", "Загружаю данные...");
    setLoading(true);
    try {
      const json = await fetchJson(`/api/cards/details?cardId=${id}`);
      const card = json.data.card;

      setCardId(card.id);
      setColumnId(card.column_id);

      setTitle(card.title ?? "");
      setProjectId(card.project_id ?? "");
      setDifficultyId(card.difficulty_id ?? "");
      setQualityLevelId(card.quality_level_id ?? "");

      setCreatedAtIso(card.created_at ? String(card.created_at) : null);

      setDeadline(card.deadline ? isoToLocalInputValue(String(card.deadline)) : "");
      setAcceptedDoneIso(String(card.accepted_at || card.updated_at || "") || null);
      setTimerTotal(Number(card.timer_total_seconds ?? 0));

      const atts: CardAttachment[] = json.data.attachments ?? [];
      setAttachments(atts);

      let incomingBlocks: CardBlock[] = (json.data.blocks ?? []).map((b: any) => ({
        id: b.id,
        type: b.type,
        position: Number(b.position ?? 0),
        payload: b.payload ?? {},
        items: b.items ?? undefined,
        attachment: b.attachment ?? undefined,
        created_at: b.created_at,
        updated_at: b.updated_at,
      }));

      const cleaned = await cleanupStaleAttachmentBlocks(incomingBlocks);
      if (cleaned) {
        const jsonR = await fetchJson(`/api/cards/details?cardId=${id}`);
        const cardR = jsonR.data.card;

        setCardId(cardR.id);
        setColumnId(cardR.column_id);

        setCreatedAtIso(cardR.created_at ? String(cardR.created_at) : null);

        const attsR: CardAttachment[] = jsonR.data.attachments ?? [];
        setAttachments(attsR);

        incomingBlocks = (jsonR.data.blocks ?? []).map((b: any) => ({
          id: b.id,
          type: b.type,
          position: Number(b.position ?? 0),
          payload: b.payload ?? {},
          items: b.items ?? undefined,
          attachment: b.attachment ?? undefined,
          created_at: b.created_at,
          updated_at: b.updated_at,
        }));
      }

      const createdLegacy = await ensureLegacyDescriptionAsBlock(card, incomingBlocks);
      if (createdLegacy) {
        const jsonL = await fetchJson(`/api/cards/details?cardId=${id}`);
        incomingBlocks = (jsonL.data.blocks ?? []).map((b: any) => ({
          id: b.id,
          type: b.type,
          position: Number(b.position ?? 0),
          payload: b.payload ?? {},
          items: b.items ?? undefined,
          attachment: b.attachment ?? undefined,
          created_at: b.created_at,
          updated_at: b.updated_at,
        }));
      }

      const attIds = new Set(atts.map((a) => a.id));
      const usedAtt = new Set(
        incomingBlocks
          .filter((b) => b.type === "attachment")
          .map((b) => String(b.payload?.attachmentId ?? ""))
          .filter(Boolean)
      );

      const missing = [...attIds].filter((id2) => !usedAtt.has(id2));
      if (missing.length > 0) {
        for (const attId of missing) {
          await fetchJson("/api/cards/blocks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: props.workspaceId,
              cardId: String(card.id),
              type: "attachment",
              payload: { attachmentId: attId },
            }),
          });
        }
        const json2 = await fetchJson(`/api/cards/details?cardId=${id}`);
        const blocks2: CardBlock[] = (json2.data.blocks ?? []).map((b: any) => ({
          id: b.id,
          type: b.type,
          position: Number(b.position ?? 0),
          payload: b.payload ?? {},
          items: b.items ?? undefined,
          attachment: b.attachment ?? undefined,
        }));
        setBlocks(blocks2.sort(sortBlocks));
        setAttachments(json2.data.attachments ?? []);
      } else {
        setBlocks(incomingBlocks.sort(sortBlocks));
      }

      setComments(json.data.comments ?? []);
      setCommentAttachments(json.data.commentAttachments ?? []);

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось открыть карточку", humanizeError(e?.message ?? e), () => loadDetails(id));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setCardId(null);
    setTitle("");
    setDeadline("");
    setAcceptedDoneIso(null);
    setCreatedAtIso(null);
    setTimerTotal(0);

    setBlocks([]);
    setAttachments([]);

    setComments([]);
    setCommentAttachments([]);
    setNewComment("");

    setProjectId(props.projects[0]?.id ?? "");
    setDifficultyId("");
    setQualityLevelId("");

    setColumnId(props.creatingColumnId ?? props.columns[0]?.id ?? "");
  }

  useEffect(() => {
    if (!props.open) {
      openKeyRef.current = "";
      opLockRef.current = false;
      return;
    }

    setTab("main");

    const key = props.editingCardId ? `edit:${props.editingCardId}` : `new:${props.creatingColumnId ?? ""}`;
    if (openKeyRef.current === key) return;
    openKeyRef.current = key;

    if (props.editingCardId) loadDetails(props.editingCardId);
    else openCreate();
  }, [props.open, props.editingCardId, props.creatingColumnId]);

  async function createCard() {
    const retry = () => createCard();
    if (!validateRequired(retry)) return;
    if (opLockRef.current) return;
    opLockRef.current = true;

    const deadlineIso = deadline ? localInputValueToIso(deadline) : null;

    showLoading("Создаю карточку", "Пожалуйста, подожди...");
    setLoading(true);
    try {
      const json = await fetchJson("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: props.workspaceId,
          boardId: props.boardId,
          columnId,
          title: title.trim(),
          projectId,
          difficultyId: difficultyId || null,
          qualityLevelId: isAccepted ? (qualityLevelId || null) : null,
          deadline: deadlineIso,
        }),
      });

      props.onCreated(json.data);
      await loadDetails(json.data.id);

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Ошибка создания", humanizeError(e?.message ?? e), retry);
    } finally {
      setLoading(false);
      opLockRef.current = false;
    }
  }

  async function saveCard() {
    const retry = () => saveCard();
    if (!cardId) return;
    if (!validateRequired(retry)) return;
    if (opLockRef.current) return;
    opLockRef.current = true;

    const deadlineIso = deadline ? localInputValueToIso(deadline) : null;

    showLoading("Сохраняю", "Пожалуйста, подожди...");
    setLoading(true);
    try {
      await fetchJson("/api/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardId,
          title: title.trim(),
          deadline: deadlineIso,
          projectId,
          columnId,
          difficultyId: difficultyId || null,
          qualityLevelId: isAccepted ? (qualityLevelId || null) : null,
        }),
      });

      props.onUpdated({
        id: cardId,
        title,
        project_id: projectId,
        column_id: columnId,
        deadline: deadlineIso,
        timer_total_seconds: timerTotal,
        difficulty_id: difficultyId || null,
        quality_level_id: isAccepted ? (qualityLevelId || null) : null,
      });

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Ошибка сохранения", humanizeError(e?.message ?? e), retry);
    } finally {
      setLoading(false);
      opLockRef.current = false;
    }
  }

  async function deleteCard() {
    if (!cardId) return;
    if (!confirm("Удалить карточку?")) return;

    const retry = () => deleteCard();

    showLoading("Удаляю", "Пожалуйста, подожди...");
    setLoading(true);
    try {
      await fetchJson(`/api/cards?id=${cardId}`, { method: "DELETE" });
      props.onDeleted(cardId);
      setOverlay({ open: false });
      props.onClose();
    } catch (e: any) {
      showError("Ошибка удаления", humanizeError(e?.message ?? e), retry);
    } finally {
      setLoading(false);
    }
  }

  function blockTitle(b: CardBlock) {
    if (b.type === "text") return b.payload?.legacy ? "Описание (перенесено)" : "Описание";
    if (b.type === "checklist") return String(b.payload?.title ?? "Чеклист");
    if (b.type === "link") return "Ссылка";
    if (b.type === "attachment") return "Фото";
    return "Блок";
  }

  function checklistProgress(b: CardBlock) {
    const items = b.items ?? [];
    const total = items.length;
    const done = items.filter((x) => x.is_done).length;
    return { done, total };
  }

  async function createBlock(type: BlockType) {
    if (!cardId) {
      return showError("Сначала создай карточку", "Нельзя добавлять блоки, пока карточка не создана.", () => {});
    }

    const retry = () => createBlock(type);

    showLoading("Добавляю блок", "Пожалуйста, подожди...");
    try {
      let payload: any = {};
      if (type === "text") payload = { text: "" };
      if (type === "checklist") payload = { title: "Новый чеклист" };
      if (type === "link") payload = { title: "", url: "" };
      if (type === "attachment") payload = { attachmentId: null };

      const json = await fetchJson("/api/cards/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: props.workspaceId, cardId, type, payload }),
      });

      const b: CardBlock = json.data;
      if (b.type === "checklist") (b as any).items = [];

      setBlocks((prev) => [...prev, b].sort(sortBlocks));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось добавить блок", humanizeError(e?.message ?? e), retry);
    }
  }

  function updateBlockLocal(id: string, updater: (b: CardBlock) => CardBlock) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)));
  }

  async function saveBlockPayload(id: string, payload: any) {
    await fetchJson("/api/cards/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, payload }),
    });
  }

  async function deleteBlock(id: string) {
    const b = blocks.find((x) => x.id === id);

    if (b?.type === "attachment") {
      const attId = String(b.payload?.attachmentId ?? "").trim();
      if (!attId) {
        if (!confirm("Удалить этот блок?")) return;
        showLoading("Удаляю блок", "Пожалуйста, подожди...");
        try {
          await fetchJson(`/api/cards/blocks?id=${id}`, { method: "DELETE" });
          setBlocks((prev) => prev.filter((bb) => bb.id !== id));
          setOverlay({ open: false });
        } catch (e: any) {
          showError("Не удалось удалить блок", humanizeError(e?.message ?? e), () => deleteBlock(id));
        }
        return;
      }

      const ok = confirm("Удалить это фото? Оно исчезнет из карточки и из списка файлов.");
      if (!ok) return;

      await deleteAttachmentFully(attId, { skipConfirm: true });
      return;
    }

    if (!confirm("Удалить этот блок?")) return;
    showLoading("Удаляю блок", "Пожалуйста, подожди...");
    try {
      await fetchJson(`/api/cards/blocks?id=${id}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось удалить блок", humanizeError(e?.message ?? e), () => deleteBlock(id));
    }
  }

  async function moveBlock(blockId: string, direction: "up" | "down") {
    showLoading("Перемещаю блок", "Пожалуйста, подожди...");
    try {
      const json = await fetchJson("/api/cards/blocks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, direction }),
      });

      const swappedWith = String(json?.swappedWith ?? "");
      if (!swappedWith) {
        setOverlay({ open: false });
        return;
      }

      setBlocks((prev) => {
        const a = prev.find((x) => x.id === blockId);
        const b = prev.find((x) => x.id === swappedWith);
        if (!a || !b) return prev;

        const aPos = a.position;
        const bPos = b.position;

        return prev
          .map((x) => (x.id === a.id ? { ...x, position: bPos } : x.id === b.id ? { ...x, position: aPos } : x))
          .slice()
          .sort(sortBlocks);
      });

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось переместить блок", humanizeError(e?.message ?? e), () => moveBlock(blockId, direction));
    }
  }

  function setChecklistItemTextLocal(blockId: string, itemId: string, text: string) {
    updateBlockLocal(blockId, (b) => {
      const items = (b.items ?? []).map((x) => (x.id === itemId ? { ...x, text } : x));
      return { ...b, items };
    });
  }

  async function saveChecklistItemText(itemId: string, text: string) {
    try {
      await fetchJson("/api/cards/checklist-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, text }),
      });
    } catch (e: any) {
      showError("Не удалось сохранить пункт", humanizeError(e?.message ?? e));
    }
  }

  async function addChecklistItem(blockId: string, text: string) {
    const t = text.trim();
    if (!t) return;
    showLoading("Добавляю пункт", "Пожалуйста, подожди...");
    try {
      const json = await fetchJson("/api/cards/checklist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, text: t }),
      });

      const it: ChecklistItem = json.data;

      updateBlockLocal(blockId, (b) => {
        const items = (b.items ?? []).slice();
        items.push(it);
        items.sort((a, c) => a.position - c.position);
        return { ...b, items };
      });

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось добавить пункт", humanizeError(e?.message ?? e), () => addChecklistItem(blockId, text));
    }
  }

  async function toggleChecklistItem(itemId: string, blockId: string, next: boolean) {
    try {
      await fetchJson("/api/cards/checklist-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, is_done: next }),
      });

      updateBlockLocal(blockId, (b) => {
        const items = (b.items ?? []).map((x) => (x.id === itemId ? { ...x, is_done: next } : x));
        return { ...b, items };
      });
    } catch (e: any) {
      showError("Не удалось обновить пункт", humanizeError(e?.message ?? e));
    }
  }

  async function deleteChecklistItem(itemId: string, blockId: string) {
    showLoading("Удаляю пункт", "Пожалуйста, подожди...");
    try {
      await fetchJson(`/api/cards/checklist-items?id=${itemId}`, { method: "DELETE" });
      updateBlockLocal(blockId, (b) => ({ ...b, items: (b.items ?? []).filter((x) => x.id !== itemId) }));
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось удалить пункт", humanizeError(e?.message ?? e), () => deleteChecklistItem(itemId, blockId));
    }
  }

  async function moveChecklistItem(itemId: string, blockId: string, direction: "up" | "down") {
    showLoading("Перемещаю пункт", "Пожалуйста, подожди...");
    try {
      const json = await fetchJson("/api/cards/checklist-items/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, direction }),
      });

      const swappedWith = String(json?.swappedWith ?? "");
      if (!swappedWith) {
        setOverlay({ open: false });
        return;
      }

      updateBlockLocal(blockId, (b) => {
        const items = (b.items ?? []).slice();
        const a = items.find((x) => x.id === itemId);
        const bb = items.find((x) => x.id === swappedWith);
        if (!a || !bb) return b;

        const aPos = a.position;
        const bPos = bb.position;

        const nextItems = items
          .map((x) => (x.id === a.id ? { ...x, position: bPos } : x.id === bb.id ? { ...x, position: aPos } : x))
          .sort((x, y) => x.position - y.position);

        return { ...b, items: nextItems };
      });

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось переместить пункт", humanizeError(e?.message ?? e), () =>
        moveChecklistItem(itemId, blockId, direction)
      );
    }
  }

  async function addComment() {
    if (!cardId) return;

    const body = newComment.trim();
    if (!body) {
      showError("Проверь поля", "Напиши текст комментария.", () => addComment());
      return;
    }

    showLoading("Отправляю комментарий", "Пожалуйста, подожди...");
    try {
      const { data: userRes } = await props.supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Unauthorized");

      const { data: c, error } = await props.supabase
        .from("card_comments")
        .insert({ workspace_id: props.workspaceId, card_id: cardId, author_user_id: uid, body })
        .select("id, author_user_id, body, created_at")
        .single();

      if (error) throw new Error(error.message);

      setComments((p) => [c, ...p]);
      setNewComment("");
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось отправить комментарий", humanizeError(e?.message ?? e), () => addComment());
    }
  }

  async function uploadCommentImage(commentId: string, file: File) {
    showLoading("Загружаю картинку", "Пожалуйста, подожди...");
    try {
      const bucket = "card-attachments";
      const safe = safeFileName(file.name);
      const path = `ws/${props.workspaceId}/comments/${commentId}/${Date.now()}_${safe}`;

      const up = await props.supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);

      const { data: row, error } = await props.supabase
        .from("card_comment_attachments")
        .insert({
          workspace_id: props.workspaceId,
          comment_id: commentId,
          bucket,
          path,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select("id, comment_id, bucket, path, mime_type, size_bytes, created_at")
        .single();

      if (error) throw new Error(error.message);

      setCommentAttachments((p) => [row, ...p]);
      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось загрузить картинку", humanizeError(e?.message ?? e), () => uploadCommentImage(commentId, file));
    }
  }

  async function uploadCardImage(file: File) {
    if (!cardId) {
      showError("Сначала создай карточку", "Нельзя загружать фото, пока карточка не создана.", () => {});
      return;
    }

    showLoading("Загружаю фото", "Пожалуйста, подожди...");
    try {
      const bucket = "card-attachments";
      const safe = safeFileName(file.name);
      const path = `ws/${props.workspaceId}/cards/${cardId}/${Date.now()}_${safe}`;

      const up = await props.supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);

      const { data: row, error } = await props.supabase
        .from("card_attachments")
        .insert({
          workspace_id: props.workspaceId,
          card_id: cardId,
          bucket,
          path,
          mime_type: file.type,
          size_bytes: file.size,
          is_cover: false,
        })
        .select("id, card_id, bucket, path, mime_type, size_bytes, width, height, is_cover, created_at")
        .single();

      if (error) throw new Error(error.message);

      await fetchJson("/api/cards/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: props.workspaceId,
          cardId,
          type: "attachment",
          payload: { attachmentId: row.id },
        }),
      });

      await loadDetails(cardId);

      setOverlay({ open: false });
    } catch (e: any) {
      showError("Не удалось загрузить фото", humanizeError(e?.message ?? e), () => uploadCardImage(file));
    }
  }

  const deadlineInfo = useMemo(() => {
    if (!deadline) return null;

    const deadlineIso = localInputValueToIso(deadline);
    if (!deadlineIso) return null;

    if (isFreezeLane && acceptedDoneIso) {
      return fmtDoneVsDeadline(deadlineIso, acceptedDoneIso);
    }

    return fmtTimeLeft(deadlineIso);
  }, [deadline, isFreezeLane, acceptedDoneIso]);

  const createdAtLine = useMemo(() => {
    if (!createdAtIso) return "";
    return fmtMoscowDateTime(createdAtIso);
  }, [createdAtIso]);

  return (
    <Modal open={props.open} onClose={props.onClose}>
      <div className="h-full flex flex-col text-[rgb(var(--fg))] dark:text-white">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className={mutedTextClass("text-xs")}>{cardId ? "Карточка" : "Новая карточка"}</div>
            <div className={strongTextClass("font-semibold truncate")}>{title || "—"}</div>
            {!!createdAtLine && <div className={mutedTextClass("mt-1 text-xs truncate")}>🕒 Создано: {createdAtLine}</div>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!cardId ? (
              <button className={primaryButtonClass("", loading)} disabled={loading} onClick={createCard}>
                Создать
              </button>
            ) : (
              <button className={primaryButtonClass("", loading)} disabled={loading} onClick={saveCard}>
                Сохранить
              </button>
            )}

            {cardId && (
              <button className={dangerButtonClass("", loading)} disabled={loading} onClick={deleteCard}>
                Удалить
              </button>
            )}

            <button className={softButtonClass()} onClick={props.onClose}>
              Закрыть
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] min-h-0">
          <div className="p-4 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <div className={mutedTextClass("text-xs")}>Название</div>
                <input className={inputClass()} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div>
                <div className={mutedTextClass("text-xs")}>Дорожка</div>
                <select className={inputClass()} value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                  {props.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={mutedTextClass("text-xs")}>Проект (обязательно)</div>
                <select className={inputClass()} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  {props.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={mutedTextClass("text-xs")}>Дедлайн (необязательно)</div>
                <input
                  type="datetime-local"
                  className={inputClass()}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
                {deadlineInfo && (
                  <div
                    className={`mt-2 text-xs ${
                      deadlineInfo.tone === "danger"
                        ? "text-red-600 dark:text-red-300"
                        : deadlineInfo.tone === "warn"
                        ? "text-amber-700 dark:text-amber-300"
                        : deadlineInfo.tone === "success"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "opacity-70 text-[rgb(var(--fg))] dark:text-white/70"
                    }`}
                  >
                    ⏳ {deadlineInfo.text}
                  </div>
                )}
              </div>

              <div>
                <div className={mutedTextClass("text-xs")}>Сложность</div>
                <select className={inputClass()} value={difficultyId} onChange={(e) => setDifficultyId(e.target.value)}>
                  <option value="">—</option>
                  {props.difficulties.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} ({d.points})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={mutedTextClass("text-xs")}>Качество (обязательно в “Принято”)</div>
                <select
                  className={inputClass()}
                  value={qualityLevelId}
                  onChange={(e) => setQualityLevelId(e.target.value)}
                  disabled={!isAccepted}
                >
                  <option value="">—</option>
                  {props.qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.coef})
                    </option>
                  ))}
                </select>
                {!isAccepted && <div className={mutedTextClass("mt-1 text-xs opacity-60")}>Качество доступно только в “Принято”.</div>}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Tab label="Контент" active={tab === "main"} onClick={() => setTab("main")} />
                <Tab label="Файлы" active={tab === "files"} onClick={() => setTab("files")} />
              </div>

              <div className={strongTextClass("text-sm opacity-80")}>
                Подзадачи: <span className="font-semibold">{overallChecklist.done}</span>/{overallChecklist.total}
              </div>
            </div>

            {tab === "main" && (
              <div className="mt-3">
                <div className={cardSurfaceClass("p-3 rounded-2xl")}>
                  <div className={strongTextClass("text-sm font-semibold")}>Добавить элемент</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className={softButtonClass()} onClick={() => createBlock("text")} disabled={!cardId}>
                      + Описание
                    </button>
                    <button className={softButtonClass()} onClick={() => createBlock("checklist")} disabled={!cardId}>
                      + Чеклист
                    </button>
                    <button className={softButtonClass()} onClick={() => createBlock("link")} disabled={!cardId}>
                      + Ссылка
                    </button>
                    <button className={softButtonClass()} onClick={() => setTab("files")} disabled={!cardId}>
                      + Фото
                    </button>
                  </div>
                  {!cardId && <div className={mutedTextClass("mt-2 text-xs opacity-60")}>Сначала нажми “Создать”.</div>}
                </div>

                <div className="mt-4 space-y-3">
                  {blocks.length === 0 ? (
                    <div className={mutedTextClass("text-sm")}>Пока нет контента. Добавь описание/чеклист/ссылку/фото.</div>
                  ) : (
                    blocks
                      .slice()
                      .sort(sortBlocks)
                      .map((b) => {
                        const prog = b.type === "checklist" ? checklistProgress(b) : null;

                        return (
                          <div key={b.id} className={cardSurfaceClass("p-3")}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex items-center gap-2">
                                <div className={strongTextClass("font-semibold truncate")}>
                                  {b.type === "checklist" ? String(b.payload?.title ?? "Чеклист") : blockTitle(b)}
                                </div>

                                {prog && <span className={badgeClass("text-xs opacity-80")}>{prog.done}/{prog.total}</span>}

                                {b.type === "link" && <span className={badgeClass("text-xs opacity-70")}>link</span>}
                                {b.type === "attachment" && <span className={badgeClass("text-xs opacity-70")}>photo</span>}
                              </div>

                              <div className="flex items-center gap-2">
                                <button className={iconButtonClass()} onClick={() => moveBlock(b.id, "up")} title="Вверх">
                                  ↑
                                </button>
                                <button className={iconButtonClass()} onClick={() => moveBlock(b.id, "down")} title="Вниз">
                                  ↓
                                </button>
                                <button className={iconButtonClass()} onClick={() => deleteBlock(b.id)} title="Удалить">
                                  ✕
                                </button>
                              </div>
                            </div>

                            {b.type === "text" && (
                              <div className="mt-3">
                                <AutoSizeTextarea
                                  className={inputClass("resize-none overflow-hidden whitespace-pre-wrap break-words")}
                                  minRows={6}
                                  placeholder="Напиши текст..."
                                  value={String(b.payload?.text ?? "")}
                                  onChange={(e) => {
                                    const nextText = e.target.value;
                                    updateBlockLocal(b.id, (x) => ({
                                      ...x,
                                      payload: { ...(x.payload ?? {}), text: nextText },
                                    }));
                                  }}
                                  onBlur={async (e) => {
                                    const payload = { ...(b.payload ?? {}), text: e.target.value };
                                    try {
                                      await saveBlockPayload(b.id, payload);
                                    } catch (e: any) {
                                      showError("Не удалось сохранить описание", humanizeError(e?.message ?? e));
                                    }
                                  }}
                                />
                              </div>
                            )}

                            {b.type === "link" && (
                              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                  <div className={mutedTextClass("text-xs")}>Название</div>
                                  <input
                                    className={inputClass()}
                                    placeholder="Например: Документ"
                                    value={String(b.payload?.title ?? "")}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      updateBlockLocal(b.id, (x) => ({
                                        ...x,
                                        payload: { ...(x.payload ?? {}), title: v },
                                      }));
                                    }}
                                    onBlur={async (e) => {
                                      try {
                                        await saveBlockPayload(b.id, {
                                          ...(b.payload ?? {}),
                                          title: String(e.target.value ?? ""),
                                        });
                                      } catch (e: any) {
                                        showError("Не удалось сохранить ссылку", humanizeError(e?.message ?? e));
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className={mutedTextClass("text-xs")}>URL</div>
                                  <input
                                    className={inputClass()}
                                    placeholder="https://..."
                                    value={String(b.payload?.url ?? "")}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      updateBlockLocal(b.id, (x) => ({
                                        ...x,
                                        payload: { ...(x.payload ?? {}), url: v },
                                      }));
                                    }}
                                    onBlur={async (e) => {
                                      try {
                                        await saveBlockPayload(b.id, { ...(b.payload ?? {}), url: String(e.target.value ?? "") });
                                      } catch (e: any) {
                                        showError("Не удалось сохранить ссылку", humanizeError(e?.message ?? e));
                                      }
                                    }}
                                  />
                                </div>

                                <div className="lg:col-span-2">
                                  {String(b.payload?.url ?? "").trim() ? (
                                    <a
                                      href={String(b.payload?.url ?? "")}
                                      target="_blank"
                                      className="inline-flex items-center gap-2 text-sm underline text-[rgb(var(--fg))] dark:text-white"
                                    >
                                      🔗 {String(b.payload?.title ?? "Открыть ссылку")}
                                    </a>
                                  ) : (
                                    <div className={mutedTextClass("text-sm opacity-60")}>Укажи URL, чтобы ссылка стала кликабельной.</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {b.type === "checklist" && (
                              <ChecklistBlock
                                block={b}
                                onRename={async (nextTitle) => {
                                  const payload = { ...(b.payload ?? {}), title: nextTitle };
                                  updateBlockLocal(b.id, (x) => ({ ...x, payload }));
                                  try {
                                    await saveBlockPayload(b.id, payload);
                                  } catch (e: any) {
                                    showError("Не удалось сохранить название чеклиста", humanizeError(e?.message ?? e));
                                  }
                                }}
                                onAddItem={(text) => addChecklistItem(b.id, text)}
                                onToggle={(itemId, next) => toggleChecklistItem(itemId, b.id, next)}
                                onChangeItemText={(itemId, text) => setChecklistItemTextLocal(b.id, itemId, text)}
                                onSaveItemText={(itemId, text) => saveChecklistItemText(itemId, text)}
                                onDeleteItem={(itemId) => deleteChecklistItem(itemId, b.id)}
                                onMoveItem={(itemId, dir) => moveChecklistItem(itemId, b.id, dir)}
                              />
                            )}

                            {b.type === "attachment" && (
                              <div className="mt-3">
                                {b.attachment ? (
                                  <a
                                    href={publicUrl(b.attachment.bucket, b.attachment.path)}
                                    target="_blank"
                                    className="block rounded-xl border overflow-hidden"
                                  >
                                    <img
                                      src={publicUrl(b.attachment.bucket, b.attachment.path)}
                                      className="w-full max-h-[420px] object-contain bg-black/5 dark:bg-white/5"
                                    />
                                  </a>
                                ) : (
                                  <div className={mutedTextClass("text-sm")}>
                                    Фото не найдено. Если ты удалял фото раньше, этот блок будет автоматически очищен при открытии карточки.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                <div className={strongTextClass("mt-6 text-sm opacity-80")}>
                  Подзадачи: <span className="font-semibold">{overallChecklist.done}</span>/{overallChecklist.total}
                </div>

                <div className={mutedTextClass("mt-3 text-sm")}>Таймер: {fmtSeconds(timerTotal)} (таймер сделаем следующим шагом)</div>
              </div>
            )}

            {tab === "files" && (
              <div className="mt-3">
                <div className={cardSurfaceClass("p-3")}>
                  <div className={strongTextClass("text-sm font-semibold")}>Добавить фото</div>
                  <div className={mutedTextClass("text-sm mt-1")}>
                    Фото сохраняются в bucket <b>card-attachments</b> и добавляются как блок.
                  </div>
                  <input
                    className="mt-3 text-[rgb(var(--fg))] dark:text-white"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCardImage(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={!cardId}
                  />
                  <div className={mutedTextClass("mt-2 text-xs opacity-60")}>
                    Совет: если файл с кириллицей в названии (например “йоу.jpg”) - мы теперь автоматически переименовываем его при загрузке.
                  </div>
                </div>

                <div className={cardSurfaceClass("mt-4 p-3")}>
                  <div className={strongTextClass("font-semibold")}>Все загруженные фото</div>
                  <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {attachments.length === 0 ? (
                      <div className={mutedTextClass("text-sm")}>Пока нет фото.</div>
                    ) : (
                      attachments.map((a) => (
                        <div key={a.id} className="relative rounded-xl border overflow-hidden">
                          <a href={publicUrl(a.bucket, a.path)} target="_blank" className="block" title="Открыть">
                            <img src={publicUrl(a.bucket, a.path)} className="w-full h-36 object-cover" />
                          </a>

                          <button
                            className={iconButtonClass("absolute top-2 right-2 bg-[rgb(var(--card))]")}
                            title="Удалить фото"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteAttachmentFully(a.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className={mutedTextClass("mt-3 text-xs")}>
                      Подсказка: удаление фото удалит его из карточки полностью (и все блоки, которые на него ссылаются).
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-l min-h-0 flex flex-col">
            <div className="p-4 border-b">
              <div className={strongTextClass("font-semibold")}>Комментарии</div>
              {!cardId && <div className={mutedTextClass("text-xs mt-1")}>Создай карточку, чтобы писать комментарии.</div>}
            </div>

            <div className="flex-1 p-4 overflow-auto space-y-3">
              {comments.length === 0 ? (
                <div className={mutedTextClass("text-sm")}>Пока нет комментариев.</div>
              ) : (
                comments.map((c) => {
                  const imgs = commentAttachments.filter((x) => x.comment_id === c.id);
                  return (
                    <div
                      key={c.id}
                      className={cardSurfaceClass("rounded-xl p-3 text-slate-950 dark:text-white")}
                    >
                      <div className="text-xs text-slate-600 dark:text-white/70">
                        {new Date(c.created_at).toLocaleString()}
                      </div>

                      <div className="mt-2 whitespace-pre-wrap break-words text-slate-950 dark:text-white">
                        {c.body}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {imgs.map((img) => (
                          <a
                            key={img.id}
                            href={publicUrl(img.bucket, img.path)}
                            target="_blank"
                            className="rounded-lg border overflow-hidden"
                          >
                            <img src={publicUrl(img.bucket, img.path)} className="w-24 h-24 object-cover" />
                          </a>
                        ))}
                      </div>

                      <div className="mt-3">
                        <label className="text-xs underline cursor-pointer text-slate-800 dark:text-white">
                          + картинка
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadCommentImage(c.id, f);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t">
              <AutoSizeTextarea
                className={inputClass("resize-none overflow-hidden whitespace-pre-wrap break-words")}
                minRows={4}
                placeholder={cardId ? "Написать комментарий..." : "Сначала создай карточку"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!cardId}
              />
              <button className={primaryButtonClass("mt-2 w-full", !cardId)} onClick={addComment} disabled={!cardId}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>

      <BlockingOverlay
        open={overlay.open}
        mode={overlay.open ? (overlay as any).mode : "loading"}
        title={overlay.open ? (overlay as any).title : undefined}
        message={overlay.open ? (overlay as any).message : undefined}
        onCloseError={overlay.open && (overlay as any).mode === "error" ? closeError : undefined}
        onRetry={overlay.open && (overlay as any).mode === "error" ? (overlay as any).retry : undefined}
      />
    </Modal>
  );
}

function ChecklistBlock(props: {
  block: CardBlock;
  onRename: (title: string) => void;
  onAddItem: (text: string) => void;
  onToggle: (itemId: string, next: boolean) => void;
  onChangeItemText: (itemId: string, text: string) => void;
  onSaveItemText: (itemId: string, text: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, dir: "up" | "down") => void;
}) {
  const b = props.block;
  const items = (b.items ?? []).slice().sort((a, c) => a.position - c.position);

  const [titleDraft, setTitleDraft] = useState(String(b.payload?.title ?? "Чеклист"));
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setTitleDraft(String(b.payload?.title ?? "Чеклист"));
  }, [b.payload?.title]);

  const done = items.filter((x) => x.is_done).length;
  const total = items.length;

  return (
    <div className="mt-3 text-[rgb(var(--fg))] dark:text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 items-start">
        <div className="min-w-0">
          <div className={mutedTextClass("text-xs")}>Название чеклиста</div>
          <AutoSizeTextarea
            className={inputClass("font-semibold resize-none overflow-hidden whitespace-pre-wrap break-words")}
            minRows={1}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => props.onRename(titleDraft.trim() || "Чеклист")}
          />
        </div>

        <div className={strongTextClass("text-sm opacity-80 lg:text-right lg:pt-8")}>
          Прогресс: <span className="font-semibold">{done}</span>/{total}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start">
        <AutoSizeTextarea
          className={inputClass("resize-none overflow-hidden whitespace-pre-wrap break-words")}
          minRows={1}
          placeholder="Новый пункт..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const v = newItem.trim();
              if (!v) return;
              props.onAddItem(v);
              setNewItem("");
            }
          }}
        />
        <button
          className={primaryButtonClass()}
          onClick={() => {
            const v = newItem.trim();
            if (!v) return;
            props.onAddItem(v);
            setNewItem("");
          }}
        >
          Добавить
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className={mutedTextClass("text-sm")}>Пока нет пунктов.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className={cardSurfaceClass("rounded-xl p-2")}>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-2 shrink-0 accent-sky-500"
                  checked={it.is_done}
                  onChange={(e) => props.onToggle(it.id, e.target.checked)}
                />

                <div className="flex-1 min-w-0">
                  <AutoSizeTextarea
                    className={inputClass("rounded-lg px-2 py-2 resize-none overflow-hidden whitespace-pre-wrap break-words")}
                    minRows={1}
                    value={it.text}
                    onChange={(e) => props.onChangeItemText(it.id, e.target.value)}
                    onBlur={(e) => props.onSaveItemText(it.id, e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button className={iconButtonClass()} onClick={() => props.onMoveItem(it.id, "up")} title="Вверх">
                    ↑
                  </button>
                  <button className={iconButtonClass()} onClick={() => props.onMoveItem(it.id, "down")} title="Вниз">
                    ↓
                  </button>
                  <button className={iconButtonClass()} onClick={() => props.onDeleteItem(it.id)} title="Удалить">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AutoSizeTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    minRows?: number;
    maxRows?: number;
  }
) {
  const { minRows = 1, maxRows, className = "", style, value, ...rest } = props;
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";

    const computed = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(computed.lineHeight || "20") || 20;
    const borderTop = Number.parseFloat(computed.borderTopWidth || "0") || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth || "0") || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop || "0") || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom || "0") || 0;

    const minHeight = Math.max(1, minRows) * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    const maxHeight =
      maxRows && maxRows > 0
        ? maxRows * lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
        : Number.POSITIVE_INFINITY;

    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resize();
  }, [value, minRows, maxRows]);

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      rows={minRows}
      style={{ ...style }}
      className={className}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
    />
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={active ? primaryButtonClass() : softButtonClass()}>{label}</button>;
}