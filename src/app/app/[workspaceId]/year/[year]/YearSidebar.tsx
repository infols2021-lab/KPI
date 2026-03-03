"use client";

import { usePathname } from "next/navigation";

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

export default function YearSidebar({
  workspaceId,
  year,
}: {
  workspaceId: string;
  year: number;
}) {
  const pathname = usePathname();
  const activeMonth = Number(pathname?.split(`/year/${year}/`)[1]?.split("/")[0] ?? 1);

  return (
    <div className="h-[calc(100%-56px)] flex flex-col">
      {/* months */}
      <div className="p-3 flex-1 overflow-auto">
        {MONTHS.map((name, idx) => {
          const m = idx + 1;
          const active = m === activeMonth;
          return (
            <a
              key={m}
              href={`/app/${workspaceId}/year/${year}/${m}`}
              className={`block rounded-xl px-3 py-2 text-sm border mb-2 ${
                active
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {name}
            </a>
          );
        })}
        <div className="h-2" />
      </div>

      {/* bottom actions */}
      <div className="px-3 pb-4 pt-3 border-t space-y-2">
        <a
          className="block rounded-xl border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          href={`/app/${workspaceId}/years`}
        >
          Настройки года
        </a>
        <a
          className="block rounded-xl border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          href={`/app/${workspaceId}/year/${year}/projects`}
        >
          Настройки проекта
        </a>
      </div>
    </div>
  );
}