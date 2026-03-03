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
    <div className="flex items-center gap-2 rounded-xl border px-2 py-1">
      <span className="text-xs opacity-70">Тема</span>

      <button
        className={`px-2 py-1 rounded-lg text-sm ${
          current === "light" ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-70"
        }`}
        onClick={() => setTheme("light")}
      >
        Свет
      </button>

      <button
        className={`px-2 py-1 rounded-lg text-sm ${
          current === "dark" ? "bg-black text-white dark:bg-white dark:text-black" : "opacity-70"
        }`}
        onClick={() => setTheme("dark")}
      >
        Тёмн
      </button>
    </div>
  );
}