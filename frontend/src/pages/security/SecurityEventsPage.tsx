import React, { useEffect, useState, useMemo } from "react";
import { Layers, RefreshCw, Search } from "lucide-react";
import { api } from "../../api/client";
import { Pagination } from "../../components/common/Pagination";

export const SecurityEventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchEvents = () => {
    setLoading(true);
    api
      .getSecurityEvents(200)
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      const q = search.toLowerCase();
      const matchSearch =
        q === "" ||
        (ev.client_ip || "").toLowerCase().includes(q) ||
        (ev.event_type || "").toLowerCase().includes(q) ||
        (ev.path || "").toLowerCase().includes(q) ||
        (ev.description || "").toLowerCase().includes(q);

      const matchSeverity =
        severityFilter === "ALL" ||
        (ev.severity || "").toUpperCase() === severityFilter;

      return matchSearch && matchSeverity;
    });
  }, [events, search, severityFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedEvents = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, effectivePage, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Security Incident & Enforcement Events</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time security triggers, rule matches, and automated quarantine actions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search IP, event, path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder-neutral-500 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="flex rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-0.5 text-xs font-mono">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  severityFilter === s
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchEvents}
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
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">Client IP</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {paginatedEvents.map((ev, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500 whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                        ev.severity === "HIGH" || ev.severity === "CRITICAL"
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white/10 dark:text-white dark:border-white/20"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                      }`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{ev.event_type}</td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 font-mono select-all">{ev.client_ip}</td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 font-mono">{ev.path || "—"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400">{ev.method || "—"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500 max-w-xs truncate">
                    {ev.description || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    {search ? "No events matching search filter." : "No security enforcement incidents recorded."}
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
          itemName="events"
        />
      </div>
    </div>
  );
};
