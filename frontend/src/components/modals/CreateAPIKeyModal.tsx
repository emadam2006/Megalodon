import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Key, Copy, Check, AlertTriangle } from "lucide-react";
import { api } from "../../api/client";

interface CreateAPIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateAPIKeyModal: React.FC<CreateAPIKeyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState<number | undefined>(undefined);
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(30);
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      const res = await api.createAPIKey({
        name: name.trim(),
        rate_limit: rateLimit || undefined,
        expires_in_days: expiresInDays || undefined,
        permissions: "*",
      });
      setCreatedKey(res.raw_key);
      onCreated();
    } catch (err: any) {
      setError(err.message || "Failed to generate API Key");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <Key className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-white">Generate API Key</h3>
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

        {createdKey ? (
          <div className="mt-4 space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-neutral-900 border border-amber-200 dark:border-neutral-700 text-amber-800 dark:text-neutral-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-white" />
              <span>
                Make sure to copy your API key now. You will not be able to view it again once dismissed.
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                readOnly
                value={createdKey}
                className="w-full px-3 py-2 pr-12 rounded-lg bg-zinc-100 dark:bg-black border border-zinc-300 dark:border-neutral-700 text-zinc-900 dark:text-white font-mono text-xs select-all"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="absolute right-1.5 top-1.5 p-1.5 text-zinc-600 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white rounded bg-zinc-200 dark:bg-neutral-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-white" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-semibold transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-mono overflow-y-auto pr-1">
            <div>
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Key Description / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. CI/CD Deployment Ingestion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Rate Limit (Req/min)</label>
              <input
                type="number"
                placeholder="Unlimited if empty"
                value={rateLimit || ""}
                onChange={(e) => setRateLimit(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-neutral-300 mb-1 font-sans text-xs">Expiration (Days)</label>
              <input
                type="number"
                value={expiresInDays || ""}
                onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
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
                {loading ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
