import React from "react";
import { Sliders, Shield, Terminal, Info } from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-zinc-900 dark:text-white" />
          <span>Platform Configuration & Security Boundaries</span>
        </h1>
        <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
          Deployment architecture parameters, trusted reverse proxy CIDRs, and observation capabilities
        </p>
      </div>

      <div className="space-y-6">
        {/* Mode Documentation Card */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <Shield className="w-5 h-5" />
            <h3 className="font-bold text-sm tracking-wide">Network Visibility Modes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800 space-y-2">
              <span className="font-semibold text-zinc-900 dark:text-white block">Mode A — Gateway Visibility</span>
              <p className="text-zinc-600 dark:text-neutral-400">
                Traffic explicitly passes through Megalodon Gateway reverse proxy. Megalodon inspects HTTP
                methods, paths, latency, headers, client IPs, and enforces distributed rate limits.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800 space-y-2">
              <span className="font-semibold text-zinc-900 dark:text-white block">Mode B — Host Network Visibility</span>
              <p className="text-zinc-600 dark:text-neutral-400">
                Megalodon Network Discovery Agent inspects host kernel networking (/proc/net, sockets,
                interfaces, routing tables). Provides listening socket inventory and connection counts.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-50 dark:bg-neutral-900/40 text-zinc-700 dark:text-neutral-300 text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
            <Info className="w-4 h-4 text-zinc-500 dark:text-neutral-300" />
            <span>Important TLS & Encryption Boundary</span>
          </div>
          <p className="text-zinc-600 dark:text-neutral-400 leading-relaxed">
            Passive host observation cannot decrypt TLS traffic on port 443 without terminating TLS. For
            full HTTP layer analytics, configure traffic to reverse-proxy through the Megalodon Gateway
            pipeline.
          </p>
        </div>

        {/* CLI Usage Reminder */}
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-semibold text-sm">
            <Terminal className="w-4 h-4" />
            <span>Megalodon Command Line Interface (CLI)</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono">
            Megalodon provides a full Typer terminal CLI for Linux administration:
          </p>
          <div className="p-3.5 rounded-lg bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-neutral-800 text-xs font-mono text-zinc-800 dark:text-neutral-300 space-y-1.5 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            <div className="text-zinc-500 dark:text-neutral-400">$ <span className="text-zinc-900 dark:text-white font-medium">megalodon status</span></div>
            <div className="text-zinc-500 dark:text-neutral-400">$ <span className="text-zinc-900 dark:text-white font-medium">megalodon network interfaces</span></div>
            <div className="text-zinc-500 dark:text-neutral-400">$ <span className="text-zinc-900 dark:text-white font-medium">megalodon network ports</span></div>
            <div className="text-zinc-500 dark:text-neutral-400">$ <span className="text-zinc-900 dark:text-white font-medium">megalodon ip block 198.51.100.42 --reason "Abusive scanning"</span></div>
            <div className="text-zinc-500 dark:text-neutral-400">$ <span className="text-zinc-900 dark:text-white font-medium">megalodon rule list</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
