import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
}) => {
  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-950 border border-zinc-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 font-sans animate-scaleIn">
        {/* Close X Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-900 transition-colors disabled:opacity-40"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Danger Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
              isDestructive
                ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 shadow-red-500/10"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 shadow-amber-500/10"
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-6 h-6 animate-pulse" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-neutral-400 leading-relaxed font-mono">
              {message}
            </p>
          </div>
        </div>

        {/* Highlighted item identifier if provided */}
        {itemName && (
          <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-neutral-900/80 border border-zinc-200 dark:border-neutral-800 text-center font-mono text-xs text-zinc-800 dark:text-neutral-200 font-semibold break-all">
            {itemName}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full px-4 py-2.5 rounded-xl text-white font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface ConfirmOptions {
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function useConfirm() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { title: "", message: "" },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve(false);
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setModalState((prev) => {
      if (prev.resolve) prev.resolve(true);
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  const confirmDialog = (
    <ConfirmModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={modalState.options.title}
      message={modalState.options.message}
      itemName={modalState.options.itemName}
      confirmText={modalState.options.confirmText}
      cancelText={modalState.options.cancelText}
      isDestructive={modalState.options.isDestructive}
    />
  );

  return { confirm, confirmDialog };
}
