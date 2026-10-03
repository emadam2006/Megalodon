import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Scale } from "lucide-react";
import { api } from "../../api/client";
import { RuleCondition } from "../../types";

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateRuleModal: React.FC<CreateRuleModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(100);
  const [action, setAction] = useState<any>("BLOCK");
  const [statusCode, setStatusCode] = useState(403);
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: "path", operator: "starts_with", value: "/admin" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { field: "method", operator: "equals", value: "POST" },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, key: keyof RuleCondition, val: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [key]: val };
    setConditions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.createSecurityRule({
        name: name.trim(),
        description: description.trim() || undefined,
        priority: Number(priority),
        conditions,
        action,
        action_parameters: action === "RETURN_STATUS" ? { status_code: statusCode } : {},
        is_enabled: true,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create security rule");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex p-4 sm:p-6 overflow-y-auto bg-black/50 dark:bg-black/80 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative m-auto w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-neutral-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-white">Visual Security Rule Builder</h3>
              <p className="text-xs text-zinc-500 dark:text-neutral-400 font-mono">Chain IF ... AND conditions with THEN actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-neutral-900 border border-red-200 dark:border-neutral-700 text-red-600 dark:text-neutral-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-mono overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Rule Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Block Admin Scanners"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Priority (1-1000)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Description</label>
            <input
              type="text"
              placeholder="e.g. Block POST requests to sensitive endpoints exceeding rate limits"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
            />
          </div>

          {/* Condition Builder */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider font-sans">
                Conditions (Evaluated with AND)
              </span>
              <button
                type="button"
                onClick={handleAddCondition}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 dark:hover:bg-neutral-700 transition-colors shadow-sm font-sans"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {conditions.map((cond, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 bg-white dark:bg-black p-2.5 rounded-lg border border-zinc-200 dark:border-neutral-850">
                <span className="text-[11px] font-bold text-zinc-600 dark:text-neutral-400 w-8">
                  {idx === 0 ? "IF" : "AND"}
                </span>

                <select
                  value={cond.field}
                  onChange={(e) => handleConditionChange(idx, "field", e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white text-xs"
                >
                  <option value="path">Path</option>
                  <option value="method">Method</option>
                  <option value="ip">Client IP</option>
                  <option value="cidr">CIDR Subnet</option>
                  <option value="user_agent">User-Agent</option>
                  <option value="destination_port">Port</option>
                  <option value="header">Header</option>
                  <option value="query_param">Query Param</option>
                </select>

                <select
                  value={cond.operator}
                  onChange={(e) => handleConditionChange(idx, "operator", e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white text-xs"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not_equals</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts_with</option>
                  <option value="regex">regex</option>
                  <option value="in_cidr">in_cidr</option>
                </select>

                <input
                  type="text"
                  required
                  placeholder="Target Value..."
                  value={cond.value}
                  onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                  className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white text-xs font-mono"
                />

                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(idx)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Action Selector */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800">
            <span className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider block mb-2 font-sans">
              THEN Action
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white font-mono text-xs"
              >
                <option value="BLOCK">BLOCK Request (403)</option>
                <option value="TEMPORARY_BLOCK">TEMPORARY BLOCK IP (30 min)</option>
                <option value="RATE_LIMIT">RATE_LIMIT Request</option>
                <option value="RETURN_STATUS">RETURN Custom Status Code</option>
                <option value="CREATE_ALERT">CREATE Alert</option>
                <option value="LOG_EVENT">LOG Event Only</option>
              </select>

              {action === "RETURN_STATUS" && (
                <input
                  type="number"
                  value={statusCode}
                  onChange={(e) => setStatusCode(Number(e.target.value))}
                  placeholder="Status code (e.g. 403, 404, 429)"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white text-xs font-mono"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:border-neutral-800 transition-colors font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold transition-colors disabled:opacity-50 font-sans shadow-sm"
            >
              {loading ? "Saving Rule..." : "Deploy Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
