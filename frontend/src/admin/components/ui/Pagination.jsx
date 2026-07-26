import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";

export default function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1 && !total) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-admin-border/80 bg-white px-4 py-3 shadow-sm shadow-slate-200/30">
      <p className="text-sm text-admin-textMuted">
        {typeof total === "number" ? (
          <>
            <span className="font-semibold text-admin-text">{total}</span>
            {" expense"}
            {total === 1 ? "" : "s"}
            {pages > 1 ? (
              <>
                {" · Page "}
                <span className="font-semibold text-admin-text">{page}</span>
                {" of "}
                <span className="font-semibold text-admin-text">{pages}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            Page <span className="font-semibold text-admin-text">{page}</span> of{" "}
            <span className="font-semibold text-admin-text">{pages}</span>
          </>
        )}
      </p>
      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="rounded-xl"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
            className="rounded-xl"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
