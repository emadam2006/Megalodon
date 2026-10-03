import React, { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  ShieldBan,
  Search,
  Check,
  FileText,
  Clock,
  CheckCircle,
  Eye,
  Activity,
} from "lucide-react";
import { api } from "../../api/client";
import { Pagination } from "../../components/common/Pagination";
import { Alert, IPPolicy } from "../../types";

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ipPolicies, setIPPolicies] = useState<IPPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<"ACTIVE" | "LOGS">("ACTIVE");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAlerts = () => {
    setLoading(true);
    api
      .getAlerts(250)
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

  const fetchPolicies = () => {
    api
      .getIPPolicies()
      .then((data) => {
        if (Array.isArray(data)) {
          setIPPolicies(data);
        }
      })
      .catch((err) => console.error("Failed to load IP policies:", err));
  };

  useEffect(() => {
    fetchAlerts();
    fetchPolicies();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchPolicies();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateAlertStatus(id, newStatus);
      if (newStatus === "RESOLVED") {
        setActionFeedback("Alert marked as RESOLVED (Neutralized). Incident archived to Alert Logs tab.");
      } else if (newStatus === "ACKNOWLEDGED") {
        setActionFeedback("Alert marked as ACKNOWLEDGED (In Progress). Incident assigned to active triage.");
      }
      setTimeout(() => setActionFeedback(null), 5000);
      fetchAlerts();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const extractIP = (alert: Alert): string | null => {
    if (alert.metadata && typeof alert.metadata === "object") {
      const meta = alert.metadata as Record<string, any>;
      if (meta.client_ip) return String(meta.client_ip);
    }
    if (alert.metadata_json) {
      try {
        const parsed = JSON.parse(alert.metadata_json);
        if (parsed.client_ip) return String(parsed.client_ip);
      } catch {
        // ignore
      }
    }
    const titleMatch = alert.title.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (titleMatch) return titleMatch[0];
    const descMatch = alert.description.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    if (descMatch) return descMatch[0];
    return null;
  };

  const isBlocked = (ip: string) => {
    return ipPolicies.some(
      (p) => p.ip_or_cidr === ip && (p.action === "BLOCK" || p.action === "TEMPORARY_BLOCK")
    );
  };

  const handleBlockIP = async (ip: string, alertTitle: string) => {
    try {
      setBlockingIp(ip);
      await api.createIPPolicy({
        ip_or_cidr: ip,
        action: "BLOCK",
        reason: `Blocked from alert: ${alertTitle}`,
      });
      await fetchPolicies();
      setActionFeedback(`IP ${ip} has been permanently blocked in Megalodon IP Policies.`);
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      alert("Failed to block IP: " + (err.message || err));
    } finally {
      setBlockingIp(null);
    }
  };

  // Metrics
  const activeAlerts = useMemo(() => alerts.filter((a) => a.status !== "RESOLVED"), [alerts]);
  const activeCount = activeAlerts.length;
  const criticalCount = alerts.filter((a) => a.status === "OPEN" && a.severity === "CRITICAL").length;
  const acknowledgedCount = alerts.filter((a) => a.status === "ACKNOWLEDGED").length;
  const resolvedCount = alerts.filter((a) => a.status === "RESOLVED").length;
  const totalLogsCount = alerts.length;

  const baseList = viewTab === "ACTIVE" ? activeAlerts : alerts;

  const filtered = useMemo(() => {
    return baseList.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        q === "" ||
        (a.title || "").toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.id || "").toLowerCase().includes(q) ||
        (a.source || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "ALL" || a.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [baseList, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, viewTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedAlerts = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, effectivePage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Platform Security Alerts</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time threat monitoring, automated WAF detection, and incident response workflow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder-neutral-500 font-mono focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 transition-colors"
            />
          </div>

          <div className="flex rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-0.5 text-xs font-mono">
            {(viewTab === "ACTIVE"
              ? ["ALL", "OPEN", "ACKNOWLEDGED"]
              : ["ALL", "RESOLVED", "ACKNOWLEDGED", "OPEN"]
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  statusFilter === s
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              fetchAlerts();
              fetchPolicies();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SOC Executive Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Threats */}
        <div
          onClick={() => {
            setViewTab("ACTIVE");
            setStatusFilter("ALL");
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            viewTab === "ACTIVE" && statusFilter === "ALL"
              ? "border-red-500 bg-red-50/60 dark:bg-red-950/40 shadow-sm"
              : "border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-zinc-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-neutral-400">
            <span>ACTIVE INCIDENTS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
            {activeCount}
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-neutral-400 mt-0.5">
            Needs action or in review
          </div>
        </div>

        {/* Critical Unhandled */}
        <div
          onClick={() => {
            setViewTab("ACTIVE");
            setStatusFilter("OPEN");
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            viewTab === "ACTIVE" && statusFilter === "OPEN"
              ? "border-red-600 bg-red-100/60 dark:bg-red-950/60 shadow-sm"
              : "border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-zinc-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-red-600 dark:text-red-400 font-semibold">
            <span>CRITICAL UNHANDLED</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
          </div>
          <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {criticalCount}
          </div>
          <div className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
            Immediate threat mitigation
          </div>
        </div>

        {/* Acknowledged / In Progress (Amber) */}
        <div
          onClick={() => {
            setViewTab("ACTIVE");
            setStatusFilter("ACKNOWLEDGED");
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            statusFilter === "ACKNOWLEDGED"
              ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-sm"
              : "border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-zinc-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold">
            <span>IN PROGRESS</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
            {acknowledgedCount}
          </div>
          <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            Acknowledged & triaged
          </div>
        </div>

        {/* Resolved / Closed (Emerald) */}
        <div
          onClick={() => {
            setViewTab("LOGS");
            setStatusFilter("RESOLVED");
          }}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            viewTab === "LOGS" && statusFilter === "RESOLVED"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm"
              : "border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-zinc-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
            <span>RESOLVED & ARCHIVED</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {resolvedCount}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            Neutralized in Alert Logs
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs: Active Alerts vs. Alert Logs */}
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-neutral-800 text-xs font-mono">
        <button
          onClick={() => {
            setViewTab("ACTIVE");
            setStatusFilter("ALL");
          }}
          className={`pb-2.5 flex items-center gap-2 border-b-2 font-medium transition-colors ${
            viewTab === "ACTIVE"
              ? "border-red-500 text-red-600 dark:text-red-400 font-semibold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Active Alerts</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeCount > 0
                ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-bold"
                : "bg-zinc-100 text-zinc-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => {
            setViewTab("LOGS");
            setStatusFilter("ALL");
          }}
          className={`pb-2.5 flex items-center gap-2 border-b-2 font-medium transition-colors ${
            viewTab === "LOGS"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Alert Logs & History</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-100 text-zinc-600 dark:bg-neutral-800 dark:text-neutral-400">
            {totalLogsCount}
          </span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerts / Logs Grid (50% width on md/lg screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedAlerts.map((alert) => {
          const isResolved = alert.status === "RESOLVED";
          const isAcknowledged = alert.status === "ACKNOWLEDGED";
          const isOpen = alert.status === "OPEN";

          const isCritical =
            isOpen &&
            (alert.severity === "CRITICAL" ||
              alert.severity === "ERROR" ||
              alert.title.toLowerCase().includes("dos") ||
              alert.title.toLowerCase().includes("waf") ||
              alert.title.toLowerCase().includes("attack"));

          const detectedIp = extractIP(alert);
          const alreadyBlocked = detectedIp ? isBlocked(detectedIp) : false;

          // Dedicated Design Scenarios:
          // Scenario 1: RESOLVED -> Emerald Green Theme
          // Scenario 2: ACKNOWLEDGED -> Rich Amber Theme
          // Scenario 3: OPEN (Critical) -> Bold Red Warning Theme
          // Scenario 4: OPEN (Normal) -> Slate / Dark Theme
          const cardClass = isResolved
            ? "border-2 border-emerald-500/70 dark:border-emerald-600/70 bg-emerald-50/50 dark:bg-emerald-950/25 shadow-sm shadow-emerald-500/5"
            : isAcknowledged
            ? "border-2 border-amber-500/70 dark:border-amber-600/70 bg-amber-50/50 dark:bg-amber-950/25 shadow-sm shadow-amber-500/10"
            : isCritical
            ? "border-2 border-red-500/90 dark:border-red-600/90 bg-red-50/50 dark:bg-red-950/30 shadow-sm shadow-red-500/10"
            : "border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-zinc-300 dark:hover:border-neutral-700";

          const headerBorderClass = isResolved
            ? "border-emerald-200/70 dark:border-emerald-900/50"
            : isAcknowledged
            ? "border-amber-200/70 dark:border-amber-900/50"
            : isCritical
            ? "border-red-200/70 dark:border-red-900/50"
            : "border-zinc-100 dark:border-neutral-900";

          const footerBorderClass = isResolved
            ? "border-emerald-200/70 dark:border-emerald-900/50 text-emerald-800/80 dark:text-emerald-400/80"
            : isAcknowledged
            ? "border-amber-200/70 dark:border-amber-900/50 text-amber-800/80 dark:text-amber-400/80"
            : isCritical
            ? "border-red-200/70 dark:border-red-900/50 text-red-700/80 dark:text-red-400/80"
            : "border-zinc-100 dark:border-neutral-900 text-zinc-500 dark:text-neutral-500";

          const descriptionClass = isResolved
            ? "text-emerald-950/90 dark:text-emerald-200/90 font-mono text-xs leading-relaxed"
            : isAcknowledged
            ? "text-amber-950/90 dark:text-amber-200/90 font-mono text-xs leading-relaxed"
            : isCritical
            ? "text-red-950/90 dark:text-red-200/90 font-mono text-xs leading-relaxed"
            : "text-zinc-700 dark:text-neutral-300 font-mono text-xs leading-relaxed";

          return (
            <div
              key={alert.id}
              className={`rounded-xl p-5 space-y-3.5 transition-all flex flex-col justify-between ${cardClass}`}
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b ${headerBorderClass}`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status Specific Title & Icon */}
                    {isResolved ? (
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{alert.title}</span>
                      </span>
                    ) : isAcknowledged ? (
                      <span className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{alert.title}</span>
                      </span>
                    ) : isCritical ? (
                      <span className="font-bold text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                        <span>{alert.title}</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                        {alert.title}
                      </span>
                    )}

                    {/* Severity Badge */}
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono border font-semibold ${
                        alert.severity === "CRITICAL"
                          ? "!bg-red-600 !text-white !border-red-700 font-bold shadow-sm"
                          : isResolved
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold"
                          : isAcknowledged
                          ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 font-bold"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-400 dark:border-neutral-800"
                      }`}
                    >
                      {alert.severity}
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isResolved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                          : isAcknowledged
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                          : isCritical
                          ? "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800"
                          : "bg-zinc-100 text-zinc-600 dark:bg-neutral-900 dark:text-neutral-400 border-zinc-200 dark:border-neutral-800"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                    {/* Block IP Action */}
                    {detectedIp && (
                      alreadyBlocked ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-900">
                          <ShieldBan className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                          <span>IP Blocked ({detectedIp})</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBlockIP(detectedIp, alert.title)}
                          disabled={blockingIp === detectedIp}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50"
                          title={`Add ${detectedIp} to Megalodon IP firewall blocklist`}
                        >
                          <ShieldBan className="w-3.5 h-3.5" />
                          <span>{blockingIp === detectedIp ? "Blocking..." : `Block IP ${detectedIp}`}</span>
                        </button>
                      )
                    )}

                    {/* Acknowledge Button (Only for OPEN status) */}
                    {isOpen && (
                      <button
                        onClick={() => handleStatusChange(alert.id, "ACKNOWLEDGED")}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition-colors shadow-sm"
                        title="Mark alert as acknowledged and actively under investigation"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {/* Acknowledged Status Indicator */}
                    {isAcknowledged && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>In Progress</span>
                      </span>
                    )}

                    {/* Resolve Button (For OPEN or ACKNOWLEDGED) */}
                    {!isResolved && (
                      <button
                        onClick={() => handleStatusChange(alert.id, "RESOLVED")}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
                        title="Mark threat as mitigated and archive to Alert Logs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {/* Resolved Status Badge */}
                    {isResolved && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Neutralized & Archived</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className={descriptionClass}>
                  {alert.description}
                </p>
              </div>

              {/* Card Footer */}
              <div
                className={`flex items-center justify-between text-[11px] font-mono pt-3 border-t ${footerBorderClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <span>ID: {alert.id.slice(0, 8)}...</span>
                  {alert.source && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        isResolved
                          ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : isAcknowledged
                          ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700"
                          : isCritical
                          ? "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                          : "bg-zinc-100 dark:bg-neutral-900 text-zinc-600 dark:text-neutral-400 border-zinc-200 dark:border-neutral-800"
                      }`}
                    >
                      {alert.source}
                    </span>
                  )}
                </div>
                <span>{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-zinc-400 dark:text-neutral-500 shadow-sm font-mono text-xs">
          {search
            ? "No alerts matching search filter."
            : viewTab === "ACTIVE"
            ? "No active security alerts. All systems running cleanly. Check 'Alert Logs & History' tab for archived incidents."
            : "No alert log history recorded."}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 overflow-hidden shadow-sm">
          <Pagination
            currentPage={effectivePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => setPageSize(size)}
            pageSizeOptions={[6, 12, 24, 50]}
            itemName={viewTab === "ACTIVE" ? "active alerts" : "alert logs"}
          />
        </div>
      )}
    </div>
  );
};
