// src/components/AppTopbar.tsx
"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

export default function AppTopbar({
  title,
  workspaceId,
}: {
  title: string;
  workspaceId: string;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error) {
        setEmail("");
        return;
      }
      setEmail(data.user?.email ?? "");
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setEmail(session?.user?.email ?? "");
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="sticky top-0 z-10 border-b bg-[rgb(var(--bg))]/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs opacity-70">Workspace</div>
          <div className="font-semibold truncate">{title}</div>

          <div className="mt-1 text-xs opacity-70 truncate">
            {email ? `Вход: ${email}` : "Вход: —"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a className="text-sm underline opacity-80" href="/app/workspaces">
            Workspaces
          </a>
          <a className="text-sm underline opacity-80" href={`/app/${workspaceId}/years`}>
            Годы
          </a>

          {/* ✅ кнопка участников/приглашений */}
          <a className="text-sm underline opacity-80" href={`/app/${workspaceId}/members`}>
            Участники
          </a>

          <ThemeToggle />

          <button className="text-sm underline opacity-80" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}