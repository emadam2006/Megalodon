import React, { useState, useMemo } from "react";
import { Radio, Play, Pause, Trash2, Search, ArrowUpRight } from "lucide-react";
import { IPDetailModal } from "../../components/modals/IPDetailModal";
import { LiveRequestEntry } from "../../types";

interface LiveTrafficPageProps {
  liveRequests: LiveRequestEntry[];
  isPaused: boolean;
  togglePause: () => void;
  clearRequests: () => void;
  wsConnected: boolean;
}

export const LiveTrafficPage: React.FC<LiveTrafficPageProps> = ({
  liveRequests,
  isPaused,
  togglePause,
  clearRequests,
  wsConnected,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState("ALL");

  const filtered = useMemo(() => {
    return liveRequests.filter((r) => {
      const matchSearch =
        search === "" ||
        (r.client_ip || "").includes(search) ||
        (r.path || "").toLowerCase().includes(search.toLowerCase());

      const matchMethod = methodFilter === "ALL" || r.method === methodFilter;

      return matchSearch && matchMethod;
    });
  }, [liveRequests, search, methodFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-white" />
            <span>Live Traffic Stream</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                wsConnected
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400 dark:bg-neutral-600"
                }`}
              ></span>
              {wsConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time WebSocket event stream of HTTP/API requests routed through Megalodon Gateway
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Filter IP or path..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder-neutral-500 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="flex rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-0.5 text-xs font-mono">
            {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  methodFilter === m
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={togglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors border ${
              isPaused
                ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-200"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-200 dark:border-neutral-800 dark:hover:bg-neutral-800"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>

          <button
            onClick={clearRequests}
            title="Clear Stream History"
            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Traffic Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-100 dark:bg-neutral-900/60 text-zinc-600 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Client IP</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Latency</th>
                <th className="px-5 py-3">Policy Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
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
                  <td className="px-5 py-3">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {r.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 max-w-xs truncate font-mono">
                    {r.path}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.status_code >= 400
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-white/10 dark:text-white dark:border-white/20"
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
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-white/10 dark:text-white dark:border-white/20"
                          : r.action_taken === "RATE_LIMITED"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                      }`}
                    >
                      {r.action_taken}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400 dark:text-neutral-500 font-mono">
                    {search ? "No events matching search filter." : "Listening for incoming gateway requests..."}
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
