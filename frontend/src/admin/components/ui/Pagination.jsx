import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";

export default function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
        <span className="sr-only sm:not-sr-only sm:inline">Prev</span>
      </Button>
      <span className="px-2 text-sm text-admin-textMuted">
        Page {page} of {pages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
      >
        <span className="sr-only sm:not-sr-only sm:inline">Next</span>
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
