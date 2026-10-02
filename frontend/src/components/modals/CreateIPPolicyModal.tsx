import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldAlert } from "lucide-react";
import { api } from "../../api/client";

interface CreateIPPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateIPPolicyModal: React.FC<CreateIPPolicyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [ipOrCidr, setIpOrCidr] = useState("");
  const [action, setAction] = useState<"ALLOW" | "BLOCK" | "TEMPORARY_BLOCK">("BLOCK");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createIPPolicy({
        ip_or_cidr: ipOrCidr.trim(),
        action,
        duration_minutes: action === "TEMPORARY_BLOCK" ? Number(durationMinutes) : undefined,
        reason: reason.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create IP policy");
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
        className="relative m-auto w-full max-w-md rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl max-h-[calc(100vh-4rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-neutral-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-neutral-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-white">Add IP Policy Rule</h3>
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
          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">IP Address or CIDR Range *</label>
            <input
              type="text"
              required
              placeholder="e.g. 192.168.1.100 or 10.0.0.0/8"
              value={ipOrCidr}
              onChange={(e) => setIpOrCidr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Action *</label>
            <select
              value={action}
              onChange={(e: any) => setAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white font-mono transition-colors"
            >
              <option value="BLOCK">BLOCK (Permanent)</option>
              <option value="TEMPORARY_BLOCK">TEMPORARY BLOCK</option>
              <option value="ALLOW">ALLOW (Whitelist)</option>
            </select>
          </div>

          {action === "TEMPORARY_BLOCK" && (
            <div>
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="10080"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Reason / Notes</label>
            <input
              type="text"
              placeholder="e.g. Suspicious brute-force attempt"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 transition-colors border border-zinc-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:border-neutral-800 font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold font-sans transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? "Saving..." : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
