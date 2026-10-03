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
  Shield,
  AlertTriangle,
  Globe,
  TrendingUp,
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
import { DashboardMetrics, LiveRequestEntry } from "../../types";

interface ObservabilityPageProps {
  liveRequests?: LiveRequestEntry[];
  wsConnected?: boolean;
}

export const ObservabilityPage: React.FC<ObservabilityPageProps> = ({
  liveRequests = [],
  wsConnected = false,
}) => {
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

  // ── Derived live traffic data for Infrastructure Matrix ──────────────────
  const liveStats = useMemo(() => {
    const total = liveRequests.length;
    const blocked = liveRequests.filter((r) => r.blocked || r.status_code === 403).length;
    const rateLimited = liveRequests.filter((r) => r.rate_limited || r.status_code === 429).length;
    const errors = liveRequests.filter((r) => r.status_code >= 500).length;

    // Top IPs by request count
    const ipMap: Record<string, { count: number; blocked: number; throttled: number }> = {};
    for (const r of liveRequests) {
      if (!ipMap[r.client_ip]) ipMap[r.client_ip] = { count: 0, blocked: 0, throttled: 0 };
      ipMap[r.client_ip].count++;
      if (r.status_code === 403 || r.action_taken === "BLOCKED" || r.action_taken === "AUTO_BLOCKED") {
        ipMap[r.client_ip].blocked++;
      } else if (r.status_code === 429 || r.rate_limited || r.action_taken === "RATE_LIMITED") {
        ipMap[r.client_ip].throttled++;
      }
    }
    const topIPs = Object.entries(ipMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([ip, s]) => ({ ip, ...s }));

    // Top paths
    const pathMap: Record<string, number> = {};
    for (const r of liveRequests) {
      pathMap[r.path] = (pathMap[r.path] || 0) + 1;
    }
    const topPaths = Object.entries(pathMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));

    // Average latency
    const avgLatency =
      total > 0
        ? Math.round(liveRequests.reduce((s, r) => s + (r.response_time_ms || 0), 0) / total)
        : 0;

    // Recent 10 requests
    const recent = liveRequests.slice(0, 10);

    return { total, blocked, rateLimited, errors, topIPs, topPaths, avgLatency, recent };
  }, [liveRequests]);


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

          {/* ── Live Stream Summary Bar ────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Captured */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">Captured</span>
                <span className={`ml-auto inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${wsConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-800"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                  {wsConnected ? "LIVE" : "OFFLINE"}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{liveStats.total}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">requests in stream</div>
            </div>

            {/* Blocked */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">Blocked</span>
              </div>
              <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">{liveStats.blocked}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {liveStats.total > 0 ? Math.round((liveStats.blocked / liveStats.total) * 100) : 0}% of traffic
              </div>
            </div>

            {/* Rate-Limited */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">Rate-Limited</span>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{liveStats.rateLimited}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {liveStats.total > 0 ? Math.round((liveStats.rateLimited / liveStats.total) * 100) : 0}% throttled
              </div>
            </div>

            {/* Avg Latency */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-neutral-400">Avg Latency</span>
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{liveStats.avgLatency} <span className="text-xs font-normal text-zinc-500">ms</span></div>
              <div className={`text-[10px] font-mono mt-0.5 ${liveStats.errors > 0 ? "text-red-500" : "text-emerald-500"}`}>
                {liveStats.errors > 0 ? `${liveStats.errors} server errors` : "No server errors"}
              </div>
            </div>
          </div>

          {/* ── Top IPs + Top Paths ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top IPs */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-700 dark:text-neutral-300" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Source IPs</h3>
                <span className="ml-auto text-[10px] font-mono text-zinc-500">{liveStats.topIPs.length} unique</span>
              </div>
              {liveStats.topIPs.length > 0 ? (
                <div className="space-y-2">
                  {liveStats.topIPs.map(({ ip, count, blocked, throttled }: any) => {
                    const pct = liveStats.total > 0 ? Math.round((count / liveStats.total) * 100) : 0;
                    const isHighRisk = blocked > 0 || (throttled ?? 0) > 10;
                    return (
                      <div key={ip} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            {isHighRisk && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                            <span className={`font-medium ${isHighRisk ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}>{ip}</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 dark:text-neutral-400">
                            {blocked > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
                                {blocked} blocked
                              </span>
                            )}
                            {(throttled ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                                {throttled} throttled
                              </span>
                            )}
                            <span>{count} reqs ({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isHighRisk ? "bg-red-500" : "bg-zinc-400 dark:bg-neutral-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-neutral-500 font-mono py-4 text-center">
                  Waiting for live traffic... Open Live Traffic Stream tab or run the traffic generator.
                </p>
              )}
            </div>

            {/* Top Paths */}
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-700 dark:text-neutral-300" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Requested Paths</h3>
                <span className="ml-auto text-[10px] font-mono text-zinc-500">{liveStats.topPaths.length} unique</span>
              </div>
              {liveStats.topPaths.length > 0 ? (
                <div className="space-y-2">
                  {liveStats.topPaths.map(({ path, count, pct }) => {
                    const isSuspicious = path.includes("..") || path.includes("passwd") || path.includes(".env") || path.includes("wp-admin") || path.includes("admin") || path.includes("--");
                    return (
                      <div key={path} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isSuspicious && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span className={`truncate max-w-[240px] ${isSuspicious ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-neutral-200"}`}>{path}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-zinc-500">
                            <span>{count}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-100 dark:bg-neutral-800 text-zinc-700 dark:text-neutral-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isSuspicious ? "bg-amber-400" : "bg-zinc-300 dark:bg-neutral-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-neutral-500 font-mono py-4 text-center">
                  No path data yet.
                </p>
              )}
            </div>
          </div>

          {/* ── Recent Requests Feed ──────────────────────────────────────── */}
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-neutral-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-zinc-700 dark:text-neutral-300" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Requests (Live Feed)</h3>
              <span className="ml-auto text-[10px] font-mono text-zinc-500 dark:text-neutral-500">last {liveStats.recent.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-500 text-[10px] uppercase tracking-wider border-b border-zinc-100 dark:border-neutral-900">
                  <tr>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">IP</th>
                    <th className="px-4 py-2.5">Method</th>
                    <th className="px-4 py-2.5">Path</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Latency</th>
                    <th className="px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900">
                  {liveStats.recent.length > 0 ? liveStats.recent.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="px-4 py-2.5 text-zinc-400 dark:text-neutral-600">{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td className="px-4 py-2.5 text-zinc-900 dark:text-white font-medium">{r.client_ip}</td>
                      <td className="px-4 py-2.5 text-zinc-700 dark:text-neutral-300">{r.method}</td>
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-neutral-400 max-w-xs truncate">{r.path}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${r.status_code >= 500 ? "bg-red-50 text-red-700 border-red-200 dark:bg-neutral-900 dark:text-red-400 dark:border-red-900" : r.status_code >= 400 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-neutral-900 dark:text-amber-400 dark:border-amber-900" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-white/5 dark:text-white dark:border-white/10"}`}>
                          {r.status_code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-neutral-400">{r.response_time_ms} ms</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${r.action_taken === "BLOCKED" ? "bg-red-50 text-red-700 border-red-200 dark:bg-white/5 dark:text-red-400 dark:border-red-900" : r.action_taken === "RATE_LIMITED" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-neutral-900 dark:text-amber-400 dark:border-amber-900" : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"}`}>
                          {r.action_taken}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-zinc-400 dark:text-neutral-600">
                        No live traffic captured yet — navigate to any page or run the traffic generator.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Service Health Cards ──────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Service Health
            </h3>
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
                    <span className={`font-medium ${(systemStats?.cpu_percent ?? 0) > 80 ? "text-red-500" : "text-zinc-900 dark:text-white"}`}>{systemStats?.cpu_percent ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Host RAM:</span>
                    <span className={`font-medium ${(systemStats?.memory_percent ?? 0) > 85 ? "text-amber-500" : "text-zinc-900 dark:text-white"}`}>
                      {systemStats?.memory_used_mb ?? 0} / {systemStats?.memory_total_mb ?? 0} MB
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
                  <div className="flex justify-between"><span>Database:</span><span className="text-zinc-900 dark:text-white font-medium">megalodon</span></div>
                  <div className="flex justify-between"><span>Driver:</span><span className="text-zinc-900 dark:text-white font-medium">asyncpg (async)</span></div>
                  <div className="flex justify-between"><span>Pool Pre-Ping:</span><span className="text-emerald-500 font-medium">Enabled</span></div>
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
                  <div className="flex justify-between"><span>Purpose:</span><span className="text-zinc-900 dark:text-white font-medium">Rate Limiting & TTL</span></div>
                  <div className="flex justify-between"><span>Algorithm:</span><span className="text-zinc-900 dark:text-white font-medium">Sliding Window</span></div>
                  <div className="flex justify-between"><span>Persistence:</span><span className="text-zinc-900 dark:text-white font-medium">Append-Only File</span></div>
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
                  <div className="flex justify-between"><span>Mode:</span><span className="text-zinc-900 dark:text-white font-medium">KRaft (No Zookeeper)</span></div>
                  <div className="flex justify-between"><span>Active Topics:</span><span className="text-zinc-900 dark:text-white font-medium">5 Topics</span></div>
                  <div className="flex justify-between"><span>Workers:</span><span className="text-emerald-500 font-medium">Analytics, Security, Alert</span></div>
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
