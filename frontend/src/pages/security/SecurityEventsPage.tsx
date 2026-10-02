import React, { useEffect, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import { api } from "../../api/client";

export const SecurityEventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    setLoading(true);
    api
      .getSecurityEvents(50)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Security Incident & Enforcement Events</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time security triggers, rule matches, and automated quarantine actions
          </p>
        </div>
        <button
          onClick={fetchEvents}
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
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Event Type</th>
                <th className="px-5 py-3">Client IP</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {events.map((ev, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500">
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
              {events.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    No security enforcement incidents recorded.
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
