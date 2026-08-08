export type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

// Simple Prev/Next pager for DRF's PageNumberPagination shape
// ({ count, next, previous, results }) — the caller passes count and the
// known page size; this derives total pages rather than needing the
// caller to track that separately.
export const Pagination = ({ page, pageSize, totalCount, onPageChange }: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4 text-sm">
      <span className="text-brown">
        Page {page} of {totalPages} · {totalCount} total
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-full border border-beige px-3 py-1.5 text-xs uppercase tracking-widest text-brown transition-colors hover:border-gold-dark hover:text-gold-dark disabled:opacity-40 disabled:pointer-events-none"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-full border border-beige px-3 py-1.5 text-xs uppercase tracking-widest text-brown transition-colors hover:border-gold-dark hover:text-gold-dark disabled:opacity-40 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
};
