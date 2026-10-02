import React, { useEffect, useState, useMemo } from "react";
import {
  Activity,
  Cpu,
  Database,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  Server,
  Zap,
  Radio,
  FileCode2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "../../api/client";
import { DashboardMetrics } from "../../types";

export const ObservabilityPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<{
    uptime_seconds: number;
    cpu_percent: number;
    memory_used_mb: number;
    memory_total_mb: number;
    memory_percent: number;
  } | null>(null);
  const [rawMetrics, setRawMetrics] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"telemetry" | "infrastructure" | "raw">("telemetry");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5000); // 5s default

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [m, r, s, raw] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getReadiness().catch(() => null),
        api.getSystemStats().catch(() => null),
        api.getRawMetrics().catch(() => ({ metrics: "" })),
      ]);
      if (m) setMetrics(m);
      if (r) setReadiness(r);
      if (s) setSystemStats(s);
      if (raw) setRawMetrics(raw.metrics || "");
    } catch (err) {
      console.error("Observability fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    if (autoRefreshInterval > 0) {
      const timer = setInterval(loadData, autoRefreshInterval);
      return () => clearInterval(timer);
    }
  }, [autoRefreshInterval]);

  const handleCopyMetrics = () => {
    navigator.clipboard.writeText(rawMetrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            metrics,
            systemStats,
            readiness,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `megalodon-telemetry-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredMetricsText = useMemo(() => {
    if (!searchTerm.trim()) return rawMetrics;
    const lines = rawMetrics.split("\n");
    return lines.filter((l) => l.toLowerCase().includes(searchTerm.toLowerCase())).join("\n");
  }, [rawMetrics, searchTerm]);

  // Format uptime
  const formatUptime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Observability & Telemetry Center</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              REAL-TIME
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Built-in Prometheus-grade timeseries aggregation, percentile latency analytics, and infrastructure health
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh interval dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono">
            <span className="text-zinc-500 dark:text-neutral-400">Poll:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              aria-label="Poll Interval"
              className="bg-transparent text-zinc-900 dark:text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value={2000}>2s (Live)</option>
              <option value={5000}>5s (Default)</option>
              <option value={15000}>15s</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-white text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "telemetry"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold"
              : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Metrics & Percentiles</span>
        </button>
        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "infrastructure"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold"
              : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Infrastructure Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "raw"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold"
              : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Prometheus Raw Scraper</span>
        </button>
      </div>

      {/* TAB 1: Live Metrics & Percentiles */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* RPS */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                Throughput (RPS)
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.requests_per_second?.toFixed(1) ?? "0.0"} <span className="text-xs font-normal text-zinc-500">req/s</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-neutral-500 mt-1 font-mono">
                Total: {metrics?.total_requests ?? 0}
              </div>
            </div>

            {/* p50 Median Latency */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                p50 Latency (Median)
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.p50_latency_ms?.toFixed(1) ?? "0.0"} <span className="text-xs font-normal text-zinc-500">ms</span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                Avg: {metrics?.avg_latency_ms?.toFixed(1) ?? "0.0"} ms
              </div>
            </div>

            {/* p95 Latency */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                p95 Latency (SLA)
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.p95_latency_ms?.toFixed(1) ?? "0.0"} <span className="text-xs font-normal text-zinc-500">ms</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-neutral-500 mt-1 font-mono">
                95% below this threshold
              </div>
            </div>

            {/* p99 Tail Latency */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                p99 Latency (Tail)
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.p99_latency_ms?.toFixed(1) ?? "0.0"} <span className="text-xs font-normal text-zinc-500">ms</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-neutral-500 mt-1 font-mono">
                Peak upper boundary
              </div>
            </div>

            {/* Error Rate */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                Error Rate %
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.error_rate_percentage?.toFixed(1) ?? "0.0"}%
              </div>
              <div className={`text-[10px] font-mono mt-1 ${
                (metrics?.error_rate_percentage ?? 0) > 5 ? "text-red-500" : "text-emerald-500"
              }`}>
                {(metrics?.error_rate_percentage ?? 0) > 5 ? "Elevated Errors" : "Within Healthy SLA"}
              </div>
            </div>

            {/* Host Sockets */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                Active Sockets
              </span>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {metrics?.active_connections_count ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-neutral-500 mt-1 font-mono">
                Across {metrics?.open_ports_count ?? 0} open ports
              </div>
            </div>
          </div>

          {/* Timeseries Visualizations (Grafana Equivalent) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Latency Percentiles Curve */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-zinc-900 dark:text-white" />
                    <span>Response Latency Distribution (p50 / p95 / p99)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-neutral-400 mt-0.5">
                    Real-time latency spread in milliseconds
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics?.traffic_timeseries && metrics.traffic_timeseries.length > 0
                      ? metrics.traffic_timeseries
                      : [{ timestamp: "Now", avg_latency_ms: 0, p50_latency_ms: 0, p95_latency_ms: 0, p99_latency_ms: 0 }]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a1a1aa" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="timestamp"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="p99_latency_ms"
                      name="p99 Latency (ms)"
                      stroke="#52525b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#p99Grad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="p95_latency_ms"
                      name="p95 Latency (ms)"
                      stroke="#a1a1aa"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#p95Grad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_latency_ms"
                      name="Avg Latency (ms)"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Request Rate & Traffic Composition */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-zinc-900 dark:text-white" />
                    <span>Traffic Volume & Policy Filtering</span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-neutral-400 mt-0.5">
                    Forwarded requests vs blocked security violations
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics?.traffic_timeseries && metrics.traffic_timeseries.length > 0
                      ? metrics.traffic_timeseries
                      : [{ timestamp: "Now", requests: 0, blocked: 0, rate_limited: 0 }]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="timestamp"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#ffffff",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="requests" name="Total Requests" fill="#ffffff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="blocked" name="Blocked (IP/Rule)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rate_limited" name="Rate-Limited" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* HTTP Status Code & Route Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">HTTP Status Codes</h3>
              <div className="space-y-3">
                {metrics?.status_distribution && Object.keys(metrics.status_distribution).length > 0 ? (
                  Object.entries(metrics.status_distribution).map(([status, count]) => {
                    const total = metrics.total_requests || 1;
                    const pct = Math.round((count / total) * 100);
                    const is2xx = status.startsWith("2");
                    const is4xx = status.startsWith("4");
                    const is5xx = status.startsWith("5");

                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className={`font-semibold ${
                            is2xx ? "text-emerald-500" : is4xx ? "text-amber-500" : is5xx ? "text-red-500" : "text-zinc-500"
                          }`}>
                            HTTP {status}
                          </span>
                          <span className="text-zinc-500 dark:text-neutral-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              is2xx ? "bg-emerald-500" : is4xx ? "bg-amber-500" : is5xx ? "bg-red-500" : "bg-zinc-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-500 font-mono">No status codes logged yet</p>
                )}
              </div>
            </div>

            {/* Top Routes Latency */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">High-Traffic Ingress Paths</h3>
              <div className="space-y-2.5">
                {metrics?.top_routes && metrics.top_routes.length > 0 ? (
                  metrics.top_routes.map((route) => (
                    <div
                      key={route.key}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-neutral-900 bg-zinc-50/50 dark:bg-neutral-900/40 text-xs font-mono"
                    >
                      <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[240px]">
                        {route.key}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 dark:text-neutral-400">{route.count} reqs</span>
                        <span className="px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-neutral-800 text-[10px] text-zinc-800 dark:text-neutral-300">
                          {route.percentage}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 font-mono">No route traffic logged yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Infrastructure Matrix */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Megalodon API Engine */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900">
                    <Server className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Megalodon API</h4>
                    <span className="text-[10px] font-mono text-zinc-500">Port 8000</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                  HEALTHY
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 text-xs font-mono space-y-1 text-zinc-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {systemStats ? formatUptime(systemStats.uptime_seconds) : "Active"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Host CPU:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">{systemStats?.cpu_percent ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Host Memory:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">
                    {systemStats?.memory_used_mb ?? 0} MB / {systemStats?.memory_total_mb ?? 0} MB
                  </span>
                </div>
              </div>
            </div>

            {/* PostgreSQL */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900">
                    <Database className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">PostgreSQL 16</h4>
                    <span className="text-[10px] font-mono text-zinc-500">Port 5432</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  readiness?.dependencies?.database === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                }`}>
                  {readiness?.dependencies?.database === "connected" ? "CONNECTED" : "CONNECTING"}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 text-xs font-mono space-y-1 text-zinc-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">megalodon</span>
                </div>
                <div className="flex justify-between">
                  <span>Driver:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">asyncpg (async)</span>
                </div>
                <div className="flex justify-between">
                  <span>Pool Pre-Ping:</span>
                  <span className="text-emerald-500 font-medium">Enabled</span>
                </div>
              </div>
            </div>

            {/* Redis */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900">
                    <Zap className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Redis 7</h4>
                    <span className="text-[10px] font-mono text-zinc-500">Port 6379</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  readiness?.dependencies?.redis === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                }`}>
                  {readiness?.dependencies?.redis === "connected" ? "CONNECTED" : "STANDALONE"}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 text-xs font-mono space-y-1 text-zinc-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Purpose:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">Rate Limiting & TTL</span>
                </div>
                <div className="flex justify-between">
                  <span>Algorithm:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">Sliding Window</span>
                </div>
                <div className="flex justify-between">
                  <span>Persistence:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">Append-Only File</span>
                </div>
              </div>
            </div>

            {/* Apache Kafka */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900">
                    <Radio className="w-4 h-4 text-zinc-900 dark:text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Apache Kafka</h4>
                    <span className="text-[10px] font-mono text-zinc-500">Port 9092</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  readiness?.dependencies?.kafka === "connected"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-zinc-100 text-zinc-800 dark:bg-neutral-800 dark:text-neutral-300"
                }`}>
                  {readiness?.dependencies?.kafka === "connected" ? "CONNECTED" : "IN-MEMORY BUS"}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-neutral-900 text-xs font-mono space-y-1 text-zinc-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">KRaft (No Zookeeper)</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Topics:</span>
                  <span className="text-zinc-900 dark:text-white font-medium">5 Topics</span>
                </div>
                <div className="flex justify-between">
                  <span>Workers:</span>
                  <span className="text-emerald-500 font-medium">Analytics, Security, Alert</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Prometheus Raw Metrics Scraper */}
      {activeTab === "raw" && (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Live Prometheus Exporter Telemetry
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-neutral-400">
                Direct export in standard OpenMetrics / Prometheus exposition format from /api/v1/metrics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter metric (e.g. megalodon_)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none w-56"
                />
              </div>

              <button
                onClick={handleCopyMetrics}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-white text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy Metrics"}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950 border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto max-h-[460px] overflow-y-auto leading-relaxed select-text">
            {filteredMetricsText ? (
              <pre className="whitespace-pre-wrap">{filteredMetricsText}</pre>
            ) : (
              <p className="text-neutral-500">No matching metrics found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
