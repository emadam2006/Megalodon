import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Radio, RefreshCw, Search, X, Filter, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { NetworkConnection } from "../../types";

const QUICK_PORT_FILTERS = [
  { label: "port:22 (SSH)", value: "port:22" },
  { label: "port:80 (HTTP)", value: "port:80" },
  { label: "port:443 (HTTPS)", value: "port:443" },
  { label: "port:8000 (API)", value: "port:8000" },
  { label: "port:8080 (Gateway)", value: "port:8080" },
  { label: "port:5432 (Postgres)", value: "port:5432" },
  { label: "port:6379 (Redis)", value: "port:6379" },
  { label: "port:9092 (Kafka)", value: "port:9092" },
];

export const ConnectionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize search from query params (e.g. ?search=port:22 or ?port=22)
  const initialSearch = useMemo(() => {
    const s = searchParams.get("search") || searchParams.get("q");
    if (s) return s;
    const p = searchParams.get("port");
    if (p) return `port:${p}`;
    return "";
  }, [searchParams]);

  const [search, setSearch] = useState(initialSearch);
  const [selectedState, setSelectedState] = useState("ALL");

  // Keep state synced with URL param if it changes externally
  useEffect(() => {
    if (initialSearch !== search) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (val.trim()) {
      setSearchParams({ search: val.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleQuickPortClick = (portVal: string) => {
    if (search.trim().toLowerCase() === portVal.toLowerCase()) {
      handleSearchChange("");
    } else {
      handleSearchChange(portVal);
    }
  };

  const fetchConnections = () => {
    setLoading(true);
    api
      .getConnections()
      .then((data) => {
        if (Array.isArray(data)) {
          setConnections(data);
        } else {
          setConnections([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const rawSearch = search.trim();

    return connections.filter((c) => {
      // 1. State filter
      const matchState =
        selectedState === "ALL" || (c.state || "").toUpperCase() === selectedState.toUpperCase();
      if (!matchState) return false;

      // 2. Search query filter
      if (!rawSearch) return true;

      const q = rawSearch.toLowerCase();

      // port:22 or port: 22 (matches source_port OR destination_port)
      const portPrefixMatch = q.match(/^port:\s*(\d+)$/i);
      if (portPrefixMatch) {
        const targetPort = parseInt(portPrefixMatch[1], 10);
        return c.source_port === targetPort || c.destination_port === targetPort;
      }

      // sport:57182 or source_port:57182
      const sportMatch = q.match(/^(?:s(?:ource)?_?port|from_?port):\s*(\d+)$/i);
      if (sportMatch) {
        return c.source_port === parseInt(sportMatch[1], 10);
      }

      // dport:22 or destination_port:22
      const dportMatch = q.match(/^(?:d(?:est(?:ination)?)?_?port|to_?port):\s*(\d+)$/i);
      if (dportMatch) {
        return c.destination_port === parseInt(dportMatch[1], 10);
      }

      // src:192.168.15.130 or from:192.168.15.130
      const srcMatch = q.match(/^(?:src|from):\s*(\S+)$/i);
      if (srcMatch) {
        const term = srcMatch[1];
        const srcSocket = `${c.source_ip}:${c.source_port}`.toLowerCase();
        return (c.source_ip || "").toLowerCase().includes(term) || srcSocket.includes(term);
      }

      // dst:178.10.10.15 or to:178.10.10.15
      const dstMatch = q.match(/^(?:dst|to):\s*(\S+)$/i);
      if (dstMatch) {
        const term = dstMatch[1];
        const dstSocket = `${c.destination_ip}:${c.destination_port}`.toLowerCase();
        return (c.destination_ip || "").toLowerCase().includes(term) || dstSocket.includes(term);
      }

      // If query is purely numeric (e.g. "22" or "57182")
      if (/^\d+$/.test(q)) {
        const portNum = parseInt(q, 10);
        if (c.source_port === portNum || c.destination_port === portNum) {
          return true;
        }
      }

      // General flexible text search
      const srcSocket = `${c.source_ip}:${c.source_port}`.toLowerCase();
      const dstSocket = `${c.destination_ip}:${c.destination_port}`.toLowerCase();
      const flowText = `from ${srcSocket} connect to ${dstSocket}`.toLowerCase();
      const procName = (c.process_name || "").toLowerCase();
      const pidStr = String(c.pid || "");
      const proto = (c.protocol || "").toLowerCase();
      const state = (c.state || "").toLowerCase();

      return (
        flowText.includes(q) ||
        srcSocket.includes(q) ||
        dstSocket.includes(q) ||
        (c.source_ip || "").toLowerCase().includes(q) ||
        (c.destination_ip || "").toLowerCase().includes(q) ||
        String(c.source_port || "").includes(q) ||
        String(c.destination_port || "").includes(q) ||
        procName.includes(q) ||
        pidStr.includes(q) ||
        proto.includes(q) ||
        state.includes(q)
      );
    });
  }, [connections, search, selectedState]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Active Network Connections</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Real-time kernel socket telemetry correlating host source sockets to target destinations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchConnections}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Search by port:22, IP, socket, or process..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 font-mono transition-colors shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 self-start sm:self-auto text-xs font-mono">
            {["ALL", "ESTABLISHED", "LISTEN", "TIME_WAIT", "CLOSE_WAIT"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedState === st
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filter Port Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 dark:text-neutral-500 mr-1">
            <Filter className="w-3 h-3" />
            <span>Quick Filters:</span>
          </div>
          {QUICK_PORT_FILTERS.map((chip) => {
            const isActive = search.trim().toLowerCase() === chip.value.toLowerCase();
            return (
              <button
                key={chip.value}
                onClick={() => handleQuickPortClick(chip.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors border ${
                  isActive
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white shadow-sm font-semibold"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 dark:hover:bg-neutral-800"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Search status & count */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-neutral-400 px-0.5">
          <div>
            {search ? (
              <span>
                Filtering by <code className="text-zinc-900 dark:text-white font-semibold">"{search}"</code>
              </span>
            ) : (
              <span>Tip: Type <code className="text-zinc-800 dark:text-neutral-200">port:22</code> or click any port below to filter instantly</span>
            )}
          </div>
          <div>
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{filtered.length}</span> of {connections.length} connections
          </div>
        </div>
      </div>

      {/* Connections Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-18rem)]">
          <table className="w-full text-left text-xs font-mono relative">
            <thead className="bg-zinc-50 dark:bg-neutral-900 border-b border-zinc-200 dark:border-neutral-800 text-zinc-600 dark:text-neutral-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-5 py-3">Protocol</th>
                <th className="px-5 py-3">Connection Flow (From Socket → Connect To Socket)</th>
                <th className="px-5 py-3">Target Port</th>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Process / Service</th>
                <th className="px-5 py-3">PID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-800/60 text-zinc-800 dark:text-neutral-200">
              {loading && connections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 dark:text-neutral-500">
                    Inspecting socket tables...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 dark:text-neutral-500 space-y-2">
                    <p>No active connections found matching criteria.</p>
                    {search && (
                      <button
                        onClick={() => handleSearchChange("")}
                        className="text-xs text-zinc-900 dark:text-white underline hover:no-underline font-mono"
                      >
                        Clear search filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                    {/* Protocol */}
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300">
                        {item.protocol}
                      </span>
                    </td>

                    {/* Connection Flow: from <source> connect to <destination> */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                        <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-neutral-500">from</span>
                        <button
                          type="button"
                          onClick={() => handleSearchChange(`port:${item.source_port}`)}
                          title={`Click to filter by port ${item.source_port}`}
                          className="font-medium text-zinc-800 dark:text-neutral-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-neutral-800 select-all transition-colors cursor-pointer"
                        >
                          {item.source_ip}:{item.source_port}
                        </button>
                        <span className="text-[11px] text-zinc-400 dark:text-neutral-500 font-medium px-0.5">connect to</span>
                        <button
                          type="button"
                          onClick={() => handleSearchChange(`port:${item.destination_port}`)}
                          title={`Click to filter by port ${item.destination_port}`}
                          className="font-bold text-zinc-900 dark:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-neutral-800 select-all transition-colors cursor-pointer"
                        >
                          {item.destination_ip}:{item.destination_port}
                        </button>
                      </div>
                    </td>

                    {/* Target Port Badge */}
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSearchChange(`port:${item.destination_port}`)}
                        title={`Filter by port ${item.destination_port}`}
                        className="font-mono text-xs font-bold text-zinc-900 dark:text-white hover:underline cursor-pointer"
                      >
                        :{item.destination_port}
                      </button>
                    </td>

                    {/* State */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                          item.state === "ESTABLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                            : item.state === "LISTEN"
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-800"
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>

                    {/* Process / Service */}
                    <td className="px-5 py-3.5 text-zinc-800 dark:text-neutral-200">
                      {item.process_name || "—"}
                    </td>

                    {/* PID */}
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-neutral-500 font-mono">
                      {item.pid || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
