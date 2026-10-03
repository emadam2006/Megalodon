import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Activity, Ban } from "lucide-react";
import { api } from "../../api/client";
import { IPDetail } from "../../types";

interface IPDetailModalProps {
  ip: string | null;
  onClose: () => void;
  onBlock?: (ip: string) => void;
}

export const IPDetailModal: React.FC<IPDetailModalProps> = ({ ip, onClose, onBlock }) => {
  const [data, setData] = useState<IPDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ip) return;
    setLoading(true);
    api
      .getIPDetails(ip)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [ip]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!ip) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex p-4 sm:p-6 overflow-y-auto bg-black/50 dark:bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative m-auto w-full max-w-3xl rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl overflow-hidden max-h-[calc(100vh-4rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{ip}</h2>
                {data && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono border ${
                      data.status === "BLOCKED"
                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-neutral-900 dark:text-white dark:border-white"
                        : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                    }`}
                  >
                    {data.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono">
                Interface: {data?.interface || "eth0"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onBlock && (
              <button
                onClick={() => onBlock(ip)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-zinc-800 dark:border-neutral-700 rounded-lg transition-colors shadow-sm"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block IP</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center text-zinc-400 dark:text-neutral-400 text-sm font-mono">
            Loading telemetry metrics for {ip}...
          </div>
        ) : (
          <div className="mt-4 space-y-6 overflow-y-auto pr-1">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Total Requests</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.total_requests}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Blocked Requests</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.blocked_requests}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Avg Latency</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.avg_latency_ms} ms</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Error Count</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.error_count}</p>
              </div>
            </div>

            {/* Top Paths & Ports */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-neutral-900/40 border border-zinc-200 dark:border-neutral-800">
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-neutral-300 uppercase tracking-wider mb-2 font-sans">
                  Top Requested Paths
                </h4>
                {data?.top_paths && data.top_paths.length > 0 ? (
                  <div className="space-y-1 text-xs font-mono">
                    {data.top_paths.map((p, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-zinc-200 dark:border-neutral-800/60">
                        <span className="text-zinc-700 dark:text-neutral-300 truncate max-w-[200px]">{p.key}</span>
                        <span className="text-zinc-900 dark:text-white font-medium">{p.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-neutral-500">No path activity recorded</p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-neutral-900/40 border border-zinc-200 dark:border-neutral-800">
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-neutral-300 uppercase tracking-wider mb-2 font-sans">
                  Ports Accessed
                </h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data?.ports_accessed && data.ports_accessed.length > 0 ? (
                    data.ports_accessed.map((port, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-mono rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-neutral-800"
                      >
                        :{port}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-neutral-500">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Request Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-700 dark:text-neutral-300 uppercase tracking-wider mb-3 font-sans">
                Recent Request Stream
              </h4>
              <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-100 dark:bg-neutral-900 text-zinc-600 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Path</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-neutral-800/60">
                    {data?.recent_requests && data.recent_requests.length > 0 ? (
                      data.recent_requests.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/50 transition-colors">
                          <td className="p-2.5 text-zinc-500 dark:text-neutral-400">
                            {new Date(r.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5 text-zinc-900 dark:text-white font-medium">{r.method}</td>
                          <td className="p-2.5 text-zinc-700 dark:text-neutral-300 truncate max-w-[180px]">{r.path}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                r.status_code >= 400
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                              }`}
                            >
                              {r.status_code}
                            </span>
                          </td>
                          <td className="p-2.5 text-zinc-500 dark:text-neutral-400">{r.response_time_ms}ms</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-400 dark:text-neutral-500">
                          No recent requests recorded
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
