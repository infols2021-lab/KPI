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
      <div className="p-3 flex-1 overflow-auto">
        {MONTHS.map((name, idx) => {
          const m = idx + 1;
          const active = m === activeMonth;

          return (
            <a
              key={m}
              href={`/app/${workspaceId}/year/${year}/${m}`}
              className={`relative block rounded-xl px-4 py-3 text-sm border mb-2 transition-all duration-200 ${
                active
                  ? "bg-sky-200/95 text-sky-950 border-sky-500 font-semibold shadow-[0_0_0_1px_rgba(14,165,233,0.28),0_10px_26px_rgba(14,165,233,0.20)] dark:bg-white dark:text-black dark:border-white"
                  : "bg-white/75 text-[rgb(var(--fg))] hover:bg-sky-50 hover:border-sky-300 hover:shadow-[0_8px_20px_rgba(59,130,246,0.10)] hover:-translate-y-[1px] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-sky-600 dark:bg-black" />
              )}
              <span className="relative z-10">{name}</span>
            </a>
          );
        })}
        <div className="h-2" />
      </div>

      <div className="px-3 pb-4 pt-3 border-t space-y-2">
        <a
          className="block rounded-xl border px-3 py-2 text-sm transition-all duration-200 bg-white/75 text-[rgb(var(--fg))] hover:bg-sky-50 hover:border-sky-300 hover:shadow-[0_8px_20px_rgba(59,130,246,0.10)] hover:-translate-y-[1px] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))]"
          href={`/app/${workspaceId}/years`}
        >
          Настройки года
        </a>

        <a
          className="block rounded-xl border px-3 py-2 text-sm transition-all duration-200 bg-white/75 text-[rgb(var(--fg))] hover:bg-sky-50 hover:border-sky-300 hover:shadow-[0_8px_20px_rgba(59,130,246,0.10)] hover:-translate-y-[1px] dark:bg-transparent dark:text-[rgb(var(--fg))] dark:hover:bg-white/10 dark:hover:border-[rgb(var(--border))]"
          href={`/app/${workspaceId}/year/${year}/projects`}
        >
          Настройки проекта
        </a>
      </div>
    </div>
  );
}