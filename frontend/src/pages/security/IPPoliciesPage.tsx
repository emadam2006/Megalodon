import React, { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, RefreshCw, Clock } from "lucide-react";
import { api } from "../../api/client";
import { CreateIPPolicyModal } from "../../components/modals/CreateIPPolicyModal";
import { IPPolicy } from "../../types";

export const IPPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<IPPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPolicies = () => {
    setLoading(true);
    api
      .getIPPolicies()
      .then((data) => {
        if (Array.isArray(data)) {
          setPolicies(data);
        } else {
          setPolicies([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this IP policy?")) return;
    try {
      await api.deleteIPPolicy(id);
      fetchPolicies();
    } catch (err: any) {
      alert("Failed to delete policy: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>IP Policy & Firewall Rules</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Allow, block, temporary quarantine, and CIDR subnet access control
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add IP Policy</span>
          </button>
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Policies Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-100 dark:bg-neutral-900/60 text-zinc-600 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">IP or CIDR Block</th>
                <th className="px-5 py-3">Enforcement Action</th>
                <th className="px-5 py-3">Duration / Expiration</th>
                <th className="px-5 py-3">Reason / Context</th>
                <th className="px-5 py-3">Author</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
              {policies.map((pol) => (
                <tr key={pol.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="px-5 py-3 text-zinc-900 dark:text-white font-medium select-all">
                    {pol.ip_or_cidr}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                        pol.action.includes("BLOCK")
                          ? "bg-red-50 text-red-600 border-red-200 dark:bg-white/10 dark:text-white dark:border-white/20"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                      }`}
                    >
                      {pol.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400">
                    {pol.expires_at ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400 dark:text-neutral-500" />
                        {new Date(pol.expires_at).toLocaleString()}
                      </span>
                    ) : (
                      "Permanent"
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300">{pol.reason || "—"}</td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-neutral-500">{pol.created_by || "system"}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(pol.id)}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-neutral-800 text-zinc-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors"
                      title="Remove policy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {policies.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400 dark:text-neutral-500">
                    No custom IP firewall rules active. All non-quarantined traffic permitted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateIPPolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchPolicies}
      />
    </div>
  );
};
