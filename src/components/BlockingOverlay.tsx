"use client";

export default function BlockingOverlay(props: {
  open: boolean;
  mode: "loading" | "error";
  title?: string;
  message?: string;
  onCloseError?: () => void;
  onRetry?: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[999] kpi-modal-root">
      <div className="absolute inset-0 kpi-modal-backdrop" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="kpi-modal-surface w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div className="font-semibold">
              {props.title ?? (props.mode === "loading" ? "Загрузка..." : "Ошибка")}
            </div>

            {props.mode === "error" && props.onCloseError && (
              <button
                className="kpi-btn kpi-btn-ghost w-9 h-9 flex items-center justify-center"
                onClick={props.onCloseError}
                title="Закрыть"
              >
                ✕
              </button>
            )}
          </div>

          <div className="p-4">
            {props.mode === "loading" ? (
              <div className="flex items-center gap-3">
                <div className="kpi-spinner" />
                <div className="text-sm opacity-90">{props.message ?? "Пожалуйста, подожди..."}</div>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap">{props.message ?? "Что-то пошло не так."}</div>
            )}

            {props.mode === "error" && (
              <div className="mt-4 flex justify-end gap-2">
                {props.onRetry && (
                  <button className="kpi-btn kpi-btn-primary" onClick={props.onRetry}>
                    Попробовать еще раз
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}