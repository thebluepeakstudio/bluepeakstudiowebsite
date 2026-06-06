import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, description, children, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-end justify-center p-0 sm:items-start sm:p-6">
        <div
          className={`relative flex w-full flex-col ${sizes[size]} max-h-[92dvh] rounded-t-xl sm:max-h-[calc(100vh-3rem)] sm:rounded-xl bg-admin-surface shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between border-b border-admin-border px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0 pr-2">
              <h2 className="text-base font-semibold text-admin-text sm:text-lg">{title}</h2>
              {description && (
                <p className="mt-0.5 text-xs text-admin-textMuted sm:text-sm">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-admin-textMuted transition-colors hover:bg-admin-muted"
            >
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
