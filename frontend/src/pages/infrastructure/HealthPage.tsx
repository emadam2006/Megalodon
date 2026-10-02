import React, { useEffect, useState } from "react";
import { HeartPulse, CheckCircle2, AlertTriangle, RefreshCw, Database, Layers, Radio } from "lucide-react";
import { api } from "../../api/client";

export const HealthPage: React.FC = () => {
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => {
    setLoading(true);
    api
      .getReadiness()
      .then((data) => setReadiness(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = readiness?.status === "healthy";
  const deps = readiness?.dependencies || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Infrastructure Health & Readiness</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time readiness inspection across PostgreSQL, Redis, Apache Kafka, and internal agents
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Check Now</span>
        </button>
      </div>

      {/* Main Status Banner */}
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white">
            {isHealthy ? <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              {isHealthy ? "All Infrastructure Services Operational" : "System Degraded or Connecting"}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono mt-0.5">
              Core platform responding: {readiness?.status || "unknown"}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-xs font-mono text-zinc-700 dark:text-neutral-300">
          STATUS: {readiness?.status?.toUpperCase() || "PENDING"}
        </div>
      </div>

      {/* Dependencies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Database */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-neutral-400">Primary Database</span>
            <Database className="w-4 h-4 text-zinc-400 dark:text-neutral-500" />
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-white font-mono">PostgreSQL 16</div>
          <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-neutral-500">Connection</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full ${deps.database === "connected" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-zinc-400 dark:bg-neutral-600"}`}></span>
              {deps.database || "unknown"}
            </span>
          </div>
        </div>

        {/* Redis */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-neutral-400">Sliding Window Cache</span>
            <Layers className="w-4 h-4 text-zinc-400 dark:text-neutral-500" />
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-white font-mono">Redis 7 (In-Memory)</div>
          <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-neutral-500">PING Heartbeat</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full ${deps.redis === "connected" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-zinc-400 dark:bg-neutral-600"}`}></span>
              {deps.redis || "unknown"}
            </span>
          </div>
        </div>

        {/* Kafka */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-neutral-400">Event Streaming Bus</span>
            <Radio className="w-4 h-4 text-zinc-400 dark:text-neutral-500" />
          </div>
          <div className="text-lg font-semibold text-zinc-900 dark:text-white font-mono">Apache Kafka (KRaft)</div>
          <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500 dark:text-neutral-500">Cluster Status</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-white">
              <span className={`w-2 h-2 rounded-full ${deps.kafka === "connected" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-zinc-400 dark:bg-neutral-600"}`}></span>
              {deps.kafka || "unknown"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
