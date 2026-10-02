import React, { useEffect, useState } from "react";
import { Key, Plus, Trash2, RefreshCw, Clock } from "lucide-react";
import { api } from "../../api/client";
import { CreateAPIKeyModal } from "../../components/modals/CreateAPIKeyModal";
import { APIKey } from "../../types";

export const APIKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchKeys = () => {
    setLoading(true);
    api
      .getAPIKeys()
      .then((data) => {
        if (Array.isArray(data)) {
          setKeys(data);
        } else {
          setKeys([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API Key permanently?")) return;
    try {
      await api.revokeAPIKey(id);
      fetchKeys();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Key className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Cryptographic API Keys</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Programmatic access keys with SHA-256 storage, per-key rate limits, and instant revocation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Key</span>
          </button>
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Label / Name</th>
                <th className="px-5 py-3">Key Prefix</th>
                <th className="px-5 py-3">Rate Limit</th>
                <th className="px-5 py-3">Scope Permissions</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{k.name}</td>
                  <td className="px-5 py-3">
                    <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-800 dark:text-neutral-300 font-mono text-[11px]">
                      {k.key_prefix}...
                    </code>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400">
                    {k.rate_limit ? `${k.rate_limit} req/min` : "Default Policy"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
                      {k.permissions}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    No active programmatic API keys created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAPIKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchKeys}
      />
    </div>
  );
};
