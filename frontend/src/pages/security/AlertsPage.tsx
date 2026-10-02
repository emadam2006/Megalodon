import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { api } from "../../api/client";
import { Alert } from "../../types";

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    api
      .getAlerts()
      .then((data) => {
        if (Array.isArray(data)) {
          setAlerts(data);
        } else {
          setAlerts([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateAlertStatus(id, newStatus);
      fetchAlerts();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Platform Security Alerts</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            System notifications, anomaly warnings, and host port opening events
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-3 hover:border-zinc-300 dark:hover:border-neutral-700 transition-colors shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-neutral-900">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 dark:text-white text-sm">{alert.title}</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                    alert.severity === "CRITICAL" || alert.severity === "ERROR"
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white/10 dark:text-white dark:border-white/20"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                  }`}
                >
                  {alert.severity}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-neutral-500">
                  Status: {alert.status}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                {alert.status === "OPEN" && (
                  <button
                    onClick={() => handleStatusChange(alert.id, "ACKNOWLEDGED")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-neutral-900 hover:bg-zinc-200 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300 text-xs transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                {alert.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleStatusChange(alert.id, "RESOLVED")}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold text-xs transition-colors shadow-sm"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-zinc-700 dark:text-neutral-300 leading-relaxed">{alert.description}</p>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-neutral-500 pt-1">
              <span>Alert ID: {alert.id.slice(0, 8)}...</span>
              <span>Triggered: {new Date(alert.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}

        {alerts.length === 0 && !loading && (
          <div className="text-center py-16 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-zinc-400 dark:text-neutral-500 shadow-sm">
            No active security alerts. Infrastructure running cleanly.
          </div>
        )}
      </div>
    </div>
  );
};
