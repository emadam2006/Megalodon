import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Network,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Layers,
} from "lucide-react";
import { api } from "../../api/client";
import { NetworkInterface } from "../../types";

export const InterfacesPage: React.FC = () => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UP" | "DOWN">("ALL");
  const [selectedInterface, setSelectedInterface] = useState<NetworkInterface | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const fetchInterfaces = () => {
    setLoading(true);
    setError(null);
    api
      .getInterfaces()
      .then((data) => {
        if (Array.isArray(data)) {
          setInterfaces(data);
        } else {
          setInterfaces([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load interfaces:", err);
        setError(err.message || "Failed to load network interfaces. Check authentication.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInterfaces();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered interfaces
  const filteredInterfaces = useMemo(() => {
    return interfaces.filter((iface) => {
      // Status filter
      if (statusFilter !== "ALL" && iface.state !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = iface.name.toLowerCase().includes(query);
        const matchesMac = (iface.mac_address || "").toLowerCase().includes(query);
        const matchesIp = (iface.addresses || []).some((addr) =>
          addr.address.toLowerCase().includes(query)
        );
        return matchesName || matchesMac || matchesIp;
      }

      return true;
    });
  }, [interfaces, statusFilter, searchQuery]);

  const upCount = interfaces.filter((i) => i.state === "UP").length;
  const downCount = interfaces.filter((i) => i.state === "DOWN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Network className="w-5 h-5 text-white" />
            <span>Host Network Interfaces</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real Linux host interfaces inspected via <code className="font-mono text-neutral-300">/proc/net/dev</code> and kernel sockets
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInterfaces}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-neutral-400">Total Interfaces</div>
            <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-white mt-0.5">{interfaces.length}</div>
          </div>
          <Layers className="w-5 h-5 text-zinc-400 dark:text-neutral-500" />
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-neutral-400">State: UP</div>
            <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-white mt-0.5">{upCount}</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-neutral-400">State: DOWN</div>
            <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-white mt-0.5">{downCount}</div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-neutral-600"></span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-neutral-400">Total Subnets</div>
            <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-white mt-0.5">
              {interfaces.reduce((acc, i) => acc + (i.addresses || []).length, 0)}
            </div>
          </div>
          <Activity className="w-5 h-5 text-zinc-400 dark:text-neutral-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search by interface name, IP, or MAC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 font-mono transition-colors"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 self-start sm:self-auto">
          {(["ALL", "UP", "DOWN"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-neutral-800 bg-red-50 dark:bg-neutral-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-red-600 dark:text-neutral-300">
            <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchInterfaces}
            className="px-3 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black font-medium text-xs hover:bg-zinc-800 dark:hover:bg-neutral-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && interfaces.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-zinc-100 dark:bg-neutral-900 rounded w-1/3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-zinc-100 dark:bg-neutral-900 rounded w-full"></div>
                <div className="h-3 bg-zinc-100 dark:bg-neutral-900 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interfaces Grid */}
      {!loading && filteredInterfaces.length === 0 && (
        <div className="py-16 text-center rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <Network className="w-10 h-10 text-zinc-400 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white">No interfaces found</h3>
          <p className="text-xs text-zinc-500 dark:text-neutral-500 mt-1">
            {searchQuery
              ? `No interfaces matching "${searchQuery}"`
              : "Waiting for host discovery agent update..."}
          </p>
          <button
            onClick={fetchInterfaces}
            className="mt-4 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black text-xs font-medium hover:bg-zinc-800 dark:hover:bg-neutral-200"
          >
            Refresh Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInterfaces.map((iface) => {
          const addresses = iface.addresses || [];
          return (
            <div
              key={iface.id || iface.name}
              onClick={() => setSelectedInterface(iface)}
              className="group cursor-pointer rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 hover:border-zinc-300 dark:hover:border-neutral-700 hover:shadow-sm dark:hover:bg-neutral-900/40 transition-all space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-zinc-900 dark:text-white text-sm tracking-tight">
                    {iface.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      iface.state === "UP"
                        ? "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        iface.state === "UP" ? "bg-emerald-500" : "bg-zinc-400 dark:bg-neutral-600"
                      }`}
                    ></span>
                    {iface.state}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-neutral-500">
                  MTU {iface.mtu || 1500}
                </span>
              </div>

              {/* Hardware / Driver Specs */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-neutral-900">
                  <span className="text-zinc-500 dark:text-neutral-500">MAC Address</span>
                  <span className="text-zinc-800 dark:text-neutral-300 select-all">{iface.mac_address || "None"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-neutral-900">
                  <span className="text-zinc-500 dark:text-neutral-500">Speed</span>
                  <span className="text-zinc-800 dark:text-neutral-300">
                    {iface.speed_mbps ? `${iface.speed_mbps} Mbps` : "Auto / Virtual"}
                  </span>
                </div>
              </div>

              {/* Assigned IP Addresses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-medium text-zinc-500 dark:text-neutral-400 uppercase tracking-wider">
                    Assigned Addresses ({addresses.length})
                  </h4>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {addresses.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 dark:text-neutral-600 italic py-1">
                      No IPv4 or IPv6 subnets configured
                    </div>
                  ) : (
                    addresses.slice(0, 3).map((addr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-neutral-900/80 border border-zinc-200 dark:border-neutral-800/80 group-hover:border-zinc-300 dark:group-hover:border-neutral-700 transition-colors"
                      >
                        <span className="text-zinc-900 dark:text-neutral-200 select-all font-mono">
                          {addr.address}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-black text-zinc-700 dark:text-neutral-400 border border-zinc-300 dark:border-neutral-800">
                            /{addr.prefix} ({addr.family})
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(addr.address);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-neutral-800 text-zinc-500 dark:text-neutral-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Copy IP"
                          >
                            {copiedText === addr.address ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {addresses.length > 3 && (
                    <div className="text-[11px] text-zinc-500 dark:text-neutral-500 text-center pt-1 font-mono">
                      + {addresses.length - 3} more addresses...
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-neutral-500 font-mono">
                <span>Last seen: recently</span>
                <span className="flex items-center gap-1 text-zinc-600 dark:text-neutral-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  Details <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interface Detail Modal */}
      {selectedInterface && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex p-4 sm:p-6 overflow-y-auto bg-black/50 dark:bg-black/80 backdrop-blur-sm"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInterface(null);
          }}
        >
          <div
            className="relative m-auto w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl space-y-5 max-h-[calc(100vh-4rem)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black font-mono font-bold text-sm shadow-sm">
                  {selectedInterface.name}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Interface Inspector</h3>
                  <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono">
                    MAC: {selectedInterface.mac_address || "Virtual Interface"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInterface(null)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-500 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                  <span className="text-zinc-500 dark:text-neutral-500 block text-[10px] uppercase font-sans">Operational State</span>
                  <span className="text-zinc-900 dark:text-white font-semibold text-sm mt-0.5 block">
                    {selectedInterface.state}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                  <span className="text-zinc-500 dark:text-neutral-500 block text-[10px] uppercase font-sans">MTU (Max Payload)</span>
                  <span className="text-zinc-900 dark:text-white font-semibold text-sm mt-0.5 block">
                    {selectedInterface.mtu || 1500} bytes
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                  <span className="text-zinc-500 dark:text-neutral-500 block text-[10px] uppercase font-sans">Link Speed</span>
                  <span className="text-zinc-900 dark:text-white font-semibold text-sm mt-0.5 block">
                    {selectedInterface.speed_mbps ? `${selectedInterface.speed_mbps} Mbps` : "Auto"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
                  <span className="text-zinc-500 dark:text-neutral-500 block text-[10px] uppercase font-sans">Subnet Count</span>
                  <span className="text-zinc-900 dark:text-white font-semibold text-sm mt-0.5 block">
                    {(selectedInterface.addresses || []).length}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-zinc-500 dark:text-neutral-400 uppercase tracking-wider mb-2 font-sans">
                  Configured Addresses
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(selectedInterface.addresses || []).map((addr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800"
                    >
                      <span className="text-zinc-900 dark:text-white font-mono">{addr.address}</span>
                      <span className="text-zinc-500 dark:text-neutral-400 text-xs font-mono">
                        /{addr.prefix} ({addr.family})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedInterface(null)}
                className="px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black font-medium text-xs dark:hover:bg-neutral-200 transition-colors shadow-sm"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
