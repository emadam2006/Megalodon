import React, { useEffect, useState } from "react";
import { Scale, Plus, Trash2, RefreshCw, Power } from "lucide-react";
import { api } from "../../api/client";
import { CreateRuleModal } from "../../components/modals/CreateRuleModal";
import { SecurityRule, RuleCondition } from "../../types";

const parseConditions = (conditionsJson?: string): RuleCondition[] => {
  try {
    return JSON.parse(conditionsJson || "[]");
  } catch {
    return [];
  }
};

export const SecurityRulesPage: React.FC = () => {
  const [rules, setRules] = useState<SecurityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRules = () => {
    setLoading(true);
    api
      .getSecurityRules()
      .then((data) => {
        if (Array.isArray(data)) {
          setRules(data);
        } else {
          setRules([]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleSecurityRule(id);
      fetchRules();
    } catch (err: any) {
      alert("Failed to toggle rule: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this security rule?")) return;
    try {
      await api.deleteSecurityRule(id);
      fetchRules();
    } catch (err: any) {
      alert("Failed to delete rule: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Security Rule Engine</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Chained condition policies (IF ... AND ... THEN ...) evaluated on every incoming request
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Rule</span>
          </button>
          <button
            onClick={fetchRules}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-4 hover:border-zinc-300 dark:hover:border-neutral-700 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-900 dark:text-white text-sm">{rule.name}</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                    rule.action === "BLOCK"
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-white/10 dark:text-white dark:border-white/20"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  {rule.action}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-neutral-500">
                  Priority: {rule.priority}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(rule.id)}
                  title={rule.is_enabled ? "Disable Rule" : "Enable Rule"}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    rule.is_enabled
                      ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-200"
                      : "bg-zinc-100 text-zinc-400 border-zinc-200 hover:text-zinc-900 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-800 dark:hover:text-white"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  title="Delete Rule"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {rule.description && (
              <p className="text-xs text-zinc-600 dark:text-neutral-400">{rule.description}</p>
            )}

            {/* Conditions Box */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800/80 space-y-1.5 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 dark:text-neutral-500 uppercase tracking-wider block font-sans">
                Matching Conditions:
              </span>
              {parseConditions(rule.conditions_json).map((cond: RuleCondition, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-zinc-700 dark:text-neutral-300">
                  <span className="text-zinc-500 dark:text-neutral-500">IF</span>
                  <span className="text-zinc-900 dark:text-white font-medium">{cond.field}</span>
                  <span className="text-zinc-500 dark:text-neutral-400">{cond.operator}</span>
                  <span className="text-zinc-800 dark:text-neutral-200 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-neutral-800">
                    "{cond.value}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {rules.length === 0 && !loading && (
          <div className="text-center py-16 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-zinc-400 dark:text-neutral-500">
            No custom security rules defined yet.
          </div>
        )}
      </div>

      <CreateRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchRules}
      />
    </div>
  );
};
