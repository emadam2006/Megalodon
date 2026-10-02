import React, { useEffect, useState, useMemo } from "react";
import { Cpu, RefreshCw, ArrowUpRight, Search, Activity } from "lucide-react";
import { api } from "../../api/client";
import { PortDetailModal } from "../../components/modals/PortDetailModal";
import { NetworkListener } from "../../types";

export const PortsPage: React.FC = () => {
  const [ports, setPorts] = useState<NetworkListener[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [filterProto, setFilterProto] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPorts = () => {
    setLoading(true);
    api
      .getPorts()
      .then((data) => {
        if (Array.isArray(data)) {
          setPorts(data);
        } else {
          setPorts([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const filtered = useMemo(() => {
    return ports.filter((p) => {
      if (filterProto !== "ALL" && p.protocol !== filterProto) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const portPrefix = query.match(/^port:\s*(\d+)$/i);
        if (portPrefix) {
          return p.port === parseInt(portPrefix[1], 10);
        }
        const matchesPort = p.port.toString().includes(query);
        const matchesAddr = (p.bind_address || "").toLowerCase().includes(query);
        const matchesProc = (p.process_name || "").toLowerCase().includes(query);
        return matchesPort || matchesAddr || matchesProc;
      }
      return true;
    });
  }, [ports, filterProto, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Listening Sockets</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Active TCP/UDP listening sockets on host inspected from kernel tables and correlated with PIDs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 p-0.5 text-xs font-mono">
            {["ALL", "TCP", "UDP"].map((proto) => (
              <button
                key={proto}
                onClick={() => setFilterProto(proto)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterProto === proto
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPorts}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Input & Sockets Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Filter by port (e.g. port:22), bind address, or process..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-neutral-600 font-mono transition-colors"
          />
        </div>
        <div className="text-xs font-mono text-zinc-500 dark:text-neutral-400">
          Showing <span className="text-zinc-900 dark:text-white font-medium">{filtered.length}</span> of {ports.length} sockets
        </div>
      </div>

      {/* Ports Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-left text-xs font-mono relative">
            <thead className="bg-zinc-50 dark:bg-neutral-900 border-b border-zinc-200 dark:border-neutral-800 text-zinc-500 dark:text-neutral-400 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-5 py-3">Protocol</th>
                <th className="px-5 py-3">Bind Address</th>
                <th className="px-5 py-3">Port</th>
                <th className="px-5 py-3">Process / Service</th>
                <th className="px-5 py-3">PID</th>
                <th className="px-5 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-800/60 text-zinc-800 dark:text-neutral-200">
              {loading && ports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 dark:text-neutral-500">
                    Inspecting host listening sockets...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 dark:text-neutral-500">
                    No listening sockets found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedPort(item.port)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300">
                        {item.protocol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700 dark:text-neutral-300 select-all">{item.bind_address}</td>
                    <td className="px-5 py-3.5 font-bold text-zinc-900 dark:text-white text-sm select-all">
                      {item.port}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-zinc-900 dark:text-white font-medium">
                        {item.process_name || "system service"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-neutral-400">
                      {item.pid ? item.pid : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-400 dark:text-neutral-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPort && (
        <PortDetailModal port={selectedPort} onClose={() => setSelectedPort(null)} />
      )}
    </div>
  );
};
