import React, { useEffect, useState, useMemo } from "react";
import {
  Activity,
  ShieldAlert,
  Radio,
  Cpu,
  ArrowUpRight,
  Server,
  Database,
  Zap,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { StatCard } from "../components/common/StatCard";
import { IPDetailModal } from "../components/modals/IPDetailModal";
import { PortDetailModal } from "../components/modals/PortDetailModal";
import { DashboardMetrics, LiveRequestEntry } from "../types";

interface DashboardPageProps {
  liveRequests: LiveRequestEntry[];
  wsConnected: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ liveRequests, wsConnected }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<{
    uptime_seconds: number;
    cpu_percent: number;
    memory_used_mb: number;
    memory_total_mb: number;
    memory_percent: number;
  } | null>(null);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);

  const fetchMetrics = () => {
    api
      .getMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Metrics load error:", err));

    api
      .getReadiness()
      .then((data) => setReadiness(data))
      .catch(() => null);

    api
      .getSystemStats()
      .then((data) => setSystemStats(data))
      .catch(() => null);
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  };

  const topSourceIPs = useMemo(() => {
    if (liveRequests && liveRequests.length > 0) {
      const total = liveRequests.length;
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
      const top = Object.entries(ipMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([ip, s]) => ({
          ip,
          count: s.count,
          blocked: s.blocked,
          throttled: s.throttled,
          pct: total > 0 ? Math.round((s.count / total) * 100) : 0,
        }));
      return { total, ips: top };
    }

    if (metrics?.top_ips && metrics.top_ips.length > 0) {
      const total = metrics.total_requests || metrics.top_ips.reduce((sum, cur) => sum + cur.count, 0) || 1;
      const top = metrics.top_ips.map((item) => ({
        ip: item.key,
        count: item.count,
        blocked: 0,
        throttled: 0,
        pct: item.percentage || Math.round((item.count / total) * 100),
      }));
      return { total, ips: top };
    }

    return { total: 0, ips: [] };
  }, [liveRequests, metrics]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Pulse */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span>Megalodon Operations Center</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-500 dark:bg-emerald-400" : "bg-zinc-400 dark:bg-neutral-500"}`}></span>
              LIVE ACTIVE
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time host socket discovery, reverse proxy metrics and security enforcement
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-600 dark:text-neutral-300">
            P50: <span className="text-zinc-900 dark:text-white font-semibold">{metrics?.p50_latency_ms || 0} ms</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-600 dark:text-neutral-300">
            P95: <span className="text-zinc-900 dark:text-white font-semibold">{metrics?.p95_latency_ms || 0} ms</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-600 dark:text-neutral-300">
            P99: <span className="text-zinc-900 dark:text-white font-semibold">{metrics?.p99_latency_ms || 0} ms</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Throughput (Req/s)"
          value={metrics?.requests_per_second ?? "0.0"}
          subtitle="Gateway ingress rate"
          icon={Activity}
          badge="Live"
        />
        <StatCard
          title="Blocked Requests"
          value={metrics?.blocked_requests ?? 0}
          subtitle="Firewall & policy enforcement"
          icon={ShieldAlert}
          badge={`${metrics?.error_rate_percentage ?? 0}% Err`}
        />
        <StatCard
          title="Listening Sockets"
          value={metrics?.open_ports_count ?? 0}
          subtitle="Observed on Linux host"
          icon={Cpu}
          badge="Kernel"
        />
        <StatCard
          title="Active Connections"
          value={metrics?.active_connections_count ?? 0}
          subtitle="Established host sockets"
          icon={Radio}
          badge="TCP/UDP"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Traffic Timeseries */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Traffic Volume Over Time</h3>
              <p className="text-xs text-zinc-500 dark:text-neutral-400">Total requests and blocked attempts</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="text-zinc-600 dark:text-neutral-300">Requests</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-zinc-600 dark:text-neutral-300">Blocked</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {metrics?.traffic_timeseries && metrics.traffic_timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.traffic_timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={isDark ? 0.35 : 0.25} />
                      <stop offset="95%" stopColor={isDark ? "#38bdf8" : "#0284c7"} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={isDark ? 0.45 : 0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#262626" : "#f4f4f5"} vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={isDark ? "#a1a1aa" : "#71717a"}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? "#27272a" : "#e4e4e7" }}
                  />
                  <YAxis
                    stroke={isDark ? "#a1a1aa" : "#71717a"}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? "#27272a" : "#e4e4e7" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#09090b" : "#ffffff",
                      borderColor: isDark ? "#27272a" : "#e4e4e7",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      color: isDark ? "#ffffff" : "#18181b",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    itemStyle={{
                      color: isDark ? "#f4f4f5" : "#18181b",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => <span className="text-zinc-700 dark:text-neutral-300 font-mono text-xs">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke={isDark ? "#38bdf8" : "#0284c7"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    name="Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorBlocked)"
                    name="Blocked Attempts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-mono text-zinc-400 dark:text-neutral-500">
                Awaiting incoming gateway requests...
              </div>
            )}
          </div>
        </div>

        {/* HTTP Status Breakdown */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">HTTP Status Distribution</h3>
            <p className="text-xs text-zinc-500 dark:text-neutral-400">Response distribution across proxy routes</p>
          </div>
          <div className="h-60 mt-3">
            {metrics?.status_distribution && Object.keys(metrics.status_distribution).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(metrics.status_distribution).map(([status, count]) => ({
                    status,
                    count,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#262626" : "#f4f4f5"} vertical={false} />
                  <XAxis
                    dataKey="status"
                    stroke={isDark ? "#a1a1aa" : "#71717a"}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? "#27272a" : "#e4e4e7" }}
                  />
                  <YAxis
                    stroke={isDark ? "#a1a1aa" : "#71717a"}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? "#27272a" : "#e4e4e7" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#09090b" : "#ffffff",
                      borderColor: isDark ? "#27272a" : "#e4e4e7",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      color: isDark ? "#ffffff" : "#18181b",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                    itemStyle={{
                      color: isDark ? "#f4f4f5" : "#18181b",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={isDark ? "#38bdf8" : "#18181b"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-mono text-zinc-400 dark:text-neutral-500">
                No requests recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Infrastructure Core Services Health Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-zinc-700 dark:text-neutral-300" />
            <span>Infrastructure Core Services Matrix</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">● All 4 Services Connected</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Megalodon API Engine */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white">
                  <Server className="w-4 h-4" />
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
                <span className={`font-medium ${(systemStats?.cpu_percent ?? 0) > 80 ? "text-red-500" : "text-zinc-900 dark:text-white"}`}>
                  {systemStats?.cpu_percent ?? 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Host Memory:</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {systemStats?.memory_used_mb ?? 0} MB / {systemStats?.memory_total_mb ?? 0} MB
                </span>
              </div>
            </div>
          </div>

          {/* PostgreSQL 16 */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">PostgreSQL 16</h4>
                  <span className="text-[10px] font-mono text-zinc-500">Port 5432</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                readiness?.dependencies?.database === "connected" || !readiness
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
              }`}>
                {readiness?.dependencies?.database === "connected" || !readiness ? "CONNECTED" : "CONNECTING"}
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

          {/* Redis 7 */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Redis 7</h4>
                  <span className="text-[10px] font-mono text-zinc-500">Port 6379</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                readiness?.dependencies?.redis === "connected" || !readiness
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
              }`}>
                {readiness?.dependencies?.redis === "connected" || !readiness ? "CONNECTED" : "STANDALONE"}
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
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Apache Kafka</h4>
                  <span className="text-[10px] font-mono text-zinc-500">Port 9092</span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                readiness?.dependencies?.kafka === "connected" || !readiness
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-zinc-100 text-zinc-800 dark:bg-neutral-800 dark:text-neutral-300"
              }`}>
                {readiness?.dependencies?.kafka === "connected" || !readiness ? "CONNECTED" : "IN-MEMORY BUS"}
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

      {/* Top Entities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Source IPs (from Observability) */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-700 dark:text-neutral-300" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Source IPs</h3>
            <span className="ml-auto text-[10px] font-mono text-zinc-500">
              {topSourceIPs.ips.length} unique
            </span>
          </div>
          {topSourceIPs.ips.length > 0 ? (
            <div className="space-y-2">
              {topSourceIPs.ips.map(({ ip, count, blocked, throttled, pct }: any) => {
                const isHighRisk = blocked > 0 || (throttled ?? 0) > 10;
                return (
                  <div
                    key={ip}
                    onClick={() => setSelectedIP(ip)}
                    className="space-y-1 cursor-pointer p-1.5 -mx-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-neutral-900/60 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        {isHighRisk && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        <span className={`font-medium ${isHighRisk ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"} hover:underline`}>
                          {ip}
                        </span>
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

        {/* Top Listening Ports */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Discovered Host Ports</h3>
            <span className="text-xs text-zinc-400 dark:text-neutral-500 font-mono">Click to Inspect</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-neutral-900 font-mono text-xs">
            {metrics?.top_ports && metrics.top_ports.length > 0 ? (
              metrics.top_ports.map((item, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedPort(Number(item.key))}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 dark:hover:bg-neutral-900/60 rounded-lg cursor-pointer transition-colors"
                >
                  <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-1.5">
                    :{item.key}
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400 dark:text-neutral-500" />
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 dark:text-neutral-400">{item.count} reqs</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 text-[10px] border border-zinc-200 dark:border-neutral-800">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-400 dark:text-neutral-500">No listening port activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Live Stream Snapshot */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-zinc-900 dark:text-white" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Live Request Ingress Stream</h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-neutral-500 font-mono">
            {liveRequests.length} recent events
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 text-[10px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Client IP</th>
                <th className="p-3">Interface</th>
                <th className="p-3">Method</th>
                <th className="p-3">Path</th>
                <th className="p-3">Status</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {liveRequests.slice(0, 8).map((req, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="p-3 text-zinc-500 dark:text-neutral-500">
                    {new Date(req.timestamp).toLocaleTimeString()}
                  </td>
                  <td
                    onClick={() => setSelectedIP(req.client_ip)}
                    className="p-3 text-zinc-900 dark:text-white font-medium hover:underline cursor-pointer"
                  >
                    {req.client_ip}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-neutral-300">{req.interface || "eth0"}</td>
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">{req.method}</td>
                  <td className="p-3 text-zinc-700 dark:text-neutral-300 truncate max-w-[200px]">{req.path}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        req.status_code >= 400
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20"
                      }`}
                    >
                      {req.status_code}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-500 dark:text-neutral-400">{req.response_time_ms} ms</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        req.action_taken === "BLOCKED"
                          ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white/10 dark:text-white dark:border-white/20"
                          : req.action_taken === "RATE_LIMITED"
                          ? "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                      }`}
                    >
                      {req.action_taken}
                    </span>
                  </td>
                </tr>
              ))}
              {liveRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400 dark:text-neutral-500">
                    Listening for incoming gateway requests...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <IPDetailModal ip={selectedIP} onClose={() => setSelectedIP(null)} />
      <PortDetailModal port={selectedPort} onClose={() => setSelectedPort(null)} />
    </div>
  );
};
