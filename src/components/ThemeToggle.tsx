"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="flex items-center gap-2 rounded-xl border px-2 py-1 bg-white/70 shadow-sm dark:bg-transparent">
      <span className="text-xs text-[rgb(var(--fg))] opacity-80">Тема</span>

      <button
        type="button"
        className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
          current === "light"
            ? "bg-sky-200 text-sky-950 border-sky-500 font-semibold shadow-[0_0_0_1px_rgba(14,165,233,0.18),0_8px_20px_rgba(14,165,233,0.18)] dark:bg-white dark:text-black dark:border-white"
            : "bg-white/80 text-[rgb(var(--fg))] border-[rgb(var(--border))] hover:bg-sky-50 hover:border-sky-300 hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(59,130,246,0.10)] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))]"
        }`}
        onClick={() => setTheme("light")}
      >
        Свет
      </button>

      <button
        type="button"
        className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 border ${
          current === "dark"
            ? "bg-slate-900 text-white border-slate-900 font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.28)] dark:bg-white dark:text-black dark:border-white"
            : "bg-white/80 text-[rgb(var(--fg))] border-[rgb(var(--border))] hover:bg-sky-50 hover:border-sky-300 hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(59,130,246,0.10)] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))]"
        }`}
        onClick={() => setTheme("dark")}
      >
        Тёмн
      </button>
    </div>
  );
}