import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  itemName = "items",
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-neutral-950 border-t border-zinc-200 dark:border-neutral-800 text-xs font-mono select-none">
      {/* Items range indicator & rows per page */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-zinc-500 dark:text-neutral-400">
        <div>
          Showing <span className="font-semibold text-zinc-800 dark:text-white">{startItem}</span> to{" "}
          <span className="font-semibold text-zinc-800 dark:text-white">{endItem}</span> of{" "}
          <span className="font-semibold text-zinc-800 dark:text-white">{totalItems}</span> {itemName}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-200 dark:border-neutral-800">
            <span className="text-[11px] text-zinc-400 dark:text-neutral-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 rounded px-1.5 py-0.5 text-xs text-zinc-800 dark:text-neutral-200 focus:outline-none"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-900 disabled:opacity-30 disabled:pointer-events-none text-zinc-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-900 disabled:opacity-30 disabled:pointer-events-none text-zinc-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {visiblePages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-zinc-400 dark:text-neutral-600">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] h-7 px-2 rounded text-xs transition-colors ${
                  currentPage === p
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold"
                    : "text-zinc-600 dark:text-neutral-400 hover:bg-zinc-100 dark:hover:bg-neutral-900"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next Page"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-900 disabled:opacity-30 disabled:pointer-events-none text-zinc-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page"
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-900 disabled:opacity-30 disabled:pointer-events-none text-zinc-600 dark:text-neutral-400 transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
