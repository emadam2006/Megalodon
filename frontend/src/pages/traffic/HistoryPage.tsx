import React, { useEffect, useState, useMemo } from "react";
import { History, RefreshCw, Search } from "lucide-react";
import { api } from "../../api/client";
import { IPDetailModal } from "../../components/modals/IPDetailModal";
import { LiveRequestEntry } from "../../types";

export const HistoryPage: React.FC = () => {
  const [requests, setRequests] = useState<LiveRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIP, setSelectedIP] = useState<string | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    api
      .getLiveRequests(100)
      .then((data) => {
        if (Array.isArray(data)) {
          setRequests(data);
        } else {
          setRequests([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter(
      (r) =>
        search === "" ||
        (r.client_ip || "").includes(search) ||
        (r.path || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [requests, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Traffic Request History</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Recorded request metadata, upstream latency, and firewall enforcement decisions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search IP or path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-neutral-500 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
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
                <th className="px-5 py-3">Client IP</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Policy Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {filtered.map((r, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td
                    onClick={() => setSelectedIP(r.client_ip)}
                    className="px-5 py-3 text-zinc-900 dark:text-white font-medium hover:underline cursor-pointer select-all"
                  >
                    {r.client_ip}
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{r.method}</td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 max-w-xs truncate">{r.path}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.status_code >= 400
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20"
                      }`}
                    >
                      {r.status_code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400">{r.response_time_ms} ms</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.action_taken === "BLOCKED"
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white/10 dark:text-white dark:border-white/20"
                          : r.action_taken === "RATE_LIMITED"
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                      }`}
                    >
                      {r.action_taken}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    No historical traffic records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IPDetailModal ip={selectedIP} onClose={() => setSelectedIP(null)} />
    </div>
  );
};
