import React, { useEffect, useState } from "react";
import { MapPin, RefreshCw, Globe, Network, Cpu, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { TopologyMap } from "../../types";

export const NetworkMapPage: React.FC = () => {
  const [mapData, setMapData] = useState<TopologyMap | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMap = () => {
    setLoading(true);
    api
      .getTopologyMap()
      .then((data) => setMapData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMap();
  }, []);

  const internetNodes = mapData?.nodes.filter((n) => n.type === "internet") || [];
  const ifaceNodes = mapData?.nodes.filter((n) => n.type === "interface") || [];
  const portNodes = mapData?.nodes.filter((n) => n.type === "port") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Network Topology Map</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Hierarchical mapping of external ingress, physical host interfaces, and listening sockets
          </p>
        </div>
        <button
          onClick={fetchMap}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Map</span>
        </button>
      </div>

      {/* Visual Flow Columns */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 min-h-[500px] shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Column 1: External / WAN Ingress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-neutral-800">
              <Globe className="w-4 h-4 text-zinc-900 dark:text-white" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                1. External Ingress
              </h3>
            </div>

            <div className="space-y-3">
              {internetNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/60 hover:border-zinc-300 dark:hover:border-neutral-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-white text-xs">{node.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300 font-mono">
                      WAN
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-neutral-400 font-mono">
                    Public Internet & client requests entering through external gateways
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Host Interfaces */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-neutral-800">
              <Network className="w-4 h-4 text-zinc-900 dark:text-white" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                2. Discovered Interfaces ({ifaceNodes.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {ifaceNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/60 hover:border-zinc-300 dark:hover:border-neutral-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white text-xs">{node.label}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
                      UP
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-neutral-400">
                    Host Adapter / Container Bridge
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Listening Services */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-neutral-800">
              <Cpu className="w-4 h-4 text-zinc-900 dark:text-white" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-400">
                3. Listening Services ({portNodes.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {portNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/60 hover:border-zinc-300 dark:hover:border-neutral-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white text-xs">{node.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-300 font-mono">
                      PORT
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-neutral-400">
                    Host socket listening on kernel interface
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
