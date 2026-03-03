"use client";

export const dynamic = "force-dynamic";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import ThemeToggle from "@/components/ThemeToggle";

function safeNextPath(next: string | null) {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const nextPath = safeNextPath(search.get("next"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        router.push(nextPath ?? "/app/workspaces");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        setMsg("Аккаунт создан ✅ Если включено подтверждение почты - проверь email.");
        setMode("signin");
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">KPI</h1>
            <p className="text-sm opacity-70 mt-1">{mode === "signin" ? "Вход" : "Регистрация"}</p>
          </div>
          <ThemeToggle />
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none"
            placeholder="Пароль"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {msg && <div className="text-sm opacity-80">{msg}</div>}

          <button
            className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm underline opacity-80"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
        </button>

        {nextPath && mode === "signin" && (
          <div className="mt-4 text-xs opacity-60">После входа вернём тебя на: {nextPath}</div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}