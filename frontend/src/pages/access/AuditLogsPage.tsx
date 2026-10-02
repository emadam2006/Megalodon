import React, { useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { api } from "../../api/client";
import { AuditLog } from "../../types";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    api
      .getAuditLogs(100)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Historical trace of policy creation, rule modifications, and access management
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
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
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{log.username || "system"}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 select-all font-mono">{log.resource}:{log.resource_id || "*"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400 font-mono">{log.source_ip || "internal"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500 max-w-xs truncate font-mono">
                    {log.metadata_json || "{}"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    No administrative audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
