import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Cpu, ExternalLink } from "lucide-react";
import { api } from "../../api/client";
import { PortDetail } from "../../types";

interface PortDetailModalProps {
  port: number | null;
  onClose: () => void;
}

export const PortDetailModal: React.FC<PortDetailModalProps> = ({ port, onClose }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<PortDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (port === null) return;
    setLoading(true);
    api
      .getPortDetails(port)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [port]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (port === null) return null;

  const handleViewInConnections = () => {
    onClose();
    navigate(`/network/connections?search=port:${port}`);
  };

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
        className="relative m-auto w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl overflow-hidden max-h-[calc(100vh-4rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-zinc-900 dark:text-white">
                  Port :{port} ({data?.protocol || "TCP"})
                </h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-100 dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 border border-zinc-200 dark:border-neutral-800">
                  {data?.bind_address || "0.0.0.0"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono">
                Process: {data?.process_name || "kernel / unavailable"} (PID: {data?.pid || "-"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center text-zinc-400 dark:text-neutral-400 text-sm font-mono">
            Loading port listener telemetry...
          </div>
        ) : (
          <div className="mt-4 space-y-6 overflow-y-auto pr-1">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Total Connections</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.total_connections ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Active Sockets</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.active_connections ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Unique Client IPs</span>
                <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white">{data?.unique_source_ips ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400">Error Rate</span>
                <p className="text-lg font-bold font-mono text-zinc-700 dark:text-neutral-300">{data?.error_rate ?? 0}%</p>
              </div>
            </div>

            {/* Command info if available */}
            {data?.command && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/40 border border-zinc-200 dark:border-neutral-800">
                <span className="text-[11px] text-zinc-500 dark:text-neutral-400 font-mono uppercase block mb-1">
                  Correlated Command Line
                </span>
                <code className="text-xs text-zinc-800 dark:text-neutral-300 font-mono break-all">{data.command}</code>
              </div>
            )}

            {/* Recent Connections */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-semibold text-zinc-700 dark:text-neutral-300 uppercase tracking-wider">
                  Connected Sockets & Host Activity
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-neutral-500">
                    {data?.recent_connections?.length || 0} active records
                  </span>
                  <button
                    type="button"
                    onClick={handleViewInConnections}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
                  >
                    <span>View in Connections</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-100 dark:bg-neutral-900 text-zinc-600 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800">
                    <tr>
                      <th className="p-2.5">Connection Flow</th>
                      <th className="p-2.5">Protocol</th>
                      <th className="p-2.5">Direction</th>
                      <th className="p-2.5">State / Status</th>
                      <th className="p-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-neutral-800/60">
                    {data?.recent_connections && data.recent_connections.length > 0 ? (
                      data.recent_connections.map((c: any, i: number) => {
                        const hasFlow = (c.source_ip && c.destination_ip) || c.flow;
                        return (
                          <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/50 transition-colors">
                            <td className="p-2.5 font-medium text-zinc-900 dark:text-white select-all">
                              {hasFlow && c.source_ip && c.destination_ip ? (
                                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                                  <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-neutral-500">from</span>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-800 dark:text-neutral-200 border border-zinc-200 dark:border-neutral-800 font-medium">
                                    {c.source_ip}:{c.source_port}
                                  </span>
                                  <span className="text-zinc-400 dark:text-neutral-500 font-medium px-0.5">connect to</span>
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white font-bold border border-zinc-200 dark:border-neutral-800">
                                    {c.destination_ip}:{c.destination_port}
                                  </span>
                                </div>
                              ) : (
                                <span>
                                  {c.client_ip}{c.remote_port ? `:${c.remote_port}` : ""}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-zinc-700 dark:text-neutral-300">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 font-mono">
                                {c.method || "TCP"}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-500 dark:text-neutral-400 text-[11px]">
                              {c.direction || "INBOUND"}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  c.status === "ESTABLISHED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                                    : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-500 dark:text-neutral-400 truncate max-w-[160px] select-all">
                              {c.process_name || c.path || (c.latency ? `${c.latency}ms` : "-")}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-neutral-500">
                          No active socket connections on port :{port}
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
