import React, { useEffect, useState } from "react";
import {
  Activity,
  ShieldAlert,
  Radio,
  Cpu,
  ArrowUpRight,
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
} from "recharts";
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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);

  const fetchMetrics = () => {
    api
      .getMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Metrics load error:", err));
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

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
          </div>
          <div className="h-64 w-full">
            {metrics?.traffic_timeseries && metrics.traffic_timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.traffic_timeseries}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tw-tooltip-bg, #ffffff)",
                      borderColor: "#e4e4e7",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#18181b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                    name="Requests"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fillOpacity={1}
                    fill="url(#colorBlocked)"
                    name="Blocked"
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
                >
                  <XAxis dataKey="status" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tw-tooltip-bg, #ffffff)",
                      borderColor: "#e4e4e7",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
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

      {/* Top Entities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Client IPs */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Top Active Client IPs</h3>
            <span className="text-xs text-zinc-400 dark:text-neutral-500 font-mono">Click to Inspect</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-neutral-900 font-mono text-xs">
            {metrics?.top_ips && metrics.top_ips.length > 0 ? (
              metrics.top_ips.map((item, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIP(item.key)}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 dark:hover:bg-neutral-900/60 rounded-lg cursor-pointer transition-colors"
                >
                  <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-1.5">
                    {item.key}
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
              <div className="py-8 text-center text-zinc-400 dark:text-neutral-500">No client IP traffic recorded</div>
            )}
          </div>
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
