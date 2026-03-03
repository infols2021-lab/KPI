"use client";

import { useEffect, useMemo, useState } from "react";
import YearSidebar from "./YearSidebar";

export default function YearShell({
  workspaceId,
  year,
  children,
}: {
  workspaceId: string;
  year: number;
  children: React.ReactNode;
}) {
  const storageKey = useMemo(() => `kpi.sidebarCollapsed:${workspaceId}`, [workspaceId]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(storageKey);
    if (v === "1") setCollapsed(true);
  }, [storageKey]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }

  const topOffset = 84; // высота topbar + небольшой запас
  const sidebarWidth = 300;

  return (
    <div className="-mx-6">
      {/* WRAPPER */}
      <div className="relative">
        {/* LEFT sidebar (fixed) */}
        {!collapsed && (
          <div
            className="fixed left-0 border-r bg-[rgb(var(--card))] z-10"
            style={{
              top: topOffset,
              height: `calc(100vh - ${topOffset}px)`,
              width: sidebarWidth,
            }}
          >
            {/* header */}
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <div>
                <div className="text-xs opacity-70">Год</div>
                <div className="text-xl font-semibold">{year}</div>
              </div>

              <button
                className="rounded-xl border w-9 h-9 flex items-center justify-center text-sm hover:bg-black/5 dark:hover:bg-white/10"
                onClick={toggle}
                title="Свернуть панель"
              >
                {"<"}
              </button>
            </div>

            {/* content */}
            <YearSidebar workspaceId={workspaceId} year={year} />
          </div>
        )}

        {/* RIGHT content (scrolls normally) */}
        <div
          style={{
            marginLeft: collapsed ? 0 : sidebarWidth,
            transition: "margin-left 200ms ease",
          }}
          className="px-6"
        >
          {children}
        </div>

        {/* floating open button when collapsed */}
        {collapsed && (
          <button
            onClick={toggle}
            className="fixed left-3 z-20 rounded-xl border bg-[rgb(var(--card))] w-10 h-10 flex items-center justify-center shadow-sm hover:bg-black/5 dark:hover:bg-white/10"
            style={{ top: topOffset + 12 }}
            title="Показать панель"
          >
            {">"}
          </button>
        )}
      </div>
    </div>
  );
}