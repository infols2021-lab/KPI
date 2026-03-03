"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 kpi-modal-root">
      <div className="absolute inset-0 kpi-modal-backdrop" onClick={onClose} />
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <div className="kpi-modal-surface w-[96vw] max-w-6xl h-[90vh] rounded-2xl border shadow-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}