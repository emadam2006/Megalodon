import React, { useEffect, useState } from "react";
import { BarChart3, RefreshCw, Clock, Activity, Gauge } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { StatCard } from "../../components/common/StatCard";
import { DashboardMetrics } from "../../types";

export const AnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setLoading(true);
    api
      .getMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Traffic & Latency Analytics</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Percentile distribution, response code aggregates, and gateway performance
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Average Latency"
          value={`${metrics?.avg_latency_ms || 0} ms`}
          subtitle="Mean response time"
          icon={Clock}
        />
        <StatCard
          title="Total Requests"
          value={metrics?.total_requests || 0}
          subtitle="Lifetime requests"
          icon={Activity}
        />
        <StatCard
          title="Blocked Traffic"
          value={metrics?.blocked_requests || 0}
          subtitle="Policy rejections"
          icon={Gauge}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Latency Percentiles</h3>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mb-4">P50, P95, and P99 latency benchmarks</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "P50", latency: metrics?.p50_latency_ms || 0 },
                  { name: "P95", latency: metrics?.p95_latency_ms || 0 },
                  { name: "P99", latency: metrics?.p99_latency_ms || 0 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#262626" : "#f4f4f5"} vertical={false} />
                <XAxis
                  dataKey="name"
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
                  unit="ms"
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
                <Bar dataKey="latency" fill={isDark ? "#38bdf8" : "#18181b"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">HTTP Status Distribution</h3>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mb-4">Traffic composition by HTTP status</p>
          <div className="h-64">
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
                  <Bar dataKey="count" fill={isDark ? "#38bdf8" : "#71717a"} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-mono text-zinc-400 dark:text-neutral-500">
                Awaiting request traffic...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
