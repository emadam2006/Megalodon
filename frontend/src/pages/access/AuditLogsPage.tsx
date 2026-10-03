import React, { useEffect, useState, useMemo } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { api } from "../../api/client";
import { Pagination } from "../../components/common/Pagination";
import { AuditLog } from "../../types";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchLogs = () => {
    setLoading(true);
    api
      .getAuditLogs(250)
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs by search keyword and action
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase();
      const matchSearch =
        q === "" ||
        (log.username || "").toLowerCase().includes(q) ||
        (log.action || "").toLowerCase().includes(q) ||
        (log.resource || "").toLowerCase().includes(q) ||
        (log.resource_id || "").toLowerCase().includes(q) ||
        (log.source_ip || "").toLowerCase().includes(q) ||
        (log.metadata_json || "").toLowerCase().includes(q);

      const matchAction =
        actionFilter === "ALL" ||
        (log.action || "").toUpperCase().includes(actionFilter.toUpperCase());

      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  // Reset to page 1 whenever search or action filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, effectivePage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Historical trace of policy creation, rule modifications, and access management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder-neutral-500 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="flex rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-0.5 text-xs font-mono">
            {["ALL", "CREATE", "UPDATE", "DELETE"].map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  actionFilter === a
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Resource Target</th>
                <th className="px-5 py-3">Source IP</th>
                <th className="px-5 py-3">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{log.username || "system"}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 select-all font-mono whitespace-nowrap">
                    {log.resource}:{log.resource_id || "*"}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400 font-mono">{log.source_ip || "internal"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500 max-w-xs truncate font-mono">
                    {log.metadata_json || "{}"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    {search ? "No audit events matching search criteria." : "No administrative audit events recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={effectivePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => setPageSize(size)}
          pageSizeOptions={[10, 15, 25, 50, 100]}
          itemName="logs"
        />
      </div>
    </div>
  );
};
