import React, { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, Check, X, Eye, EyeOff, LogOut, ArrowRight, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { AuthUser } from "../../context/AuthContext";

interface FirstLoginModalProps {
  user: AuthUser;
  onSuccess: (tokens: { access_token: string; refresh_token: string }) => void;
  onLogout: () => void;
}

const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/~`]/;

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({
  user,
  onSuccess,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState(user.username === "admin" ? "" : user.username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Policy Checks
  const isUsernameLengthValid = newUsername.trim().length >= 3;
  const isUsernamePatternValid = /^[a-zA-Z0-9_\-.]+$/.test(newUsername.trim());
  const isUsernameValid = isUsernameLengthValid && isUsernamePatternValid;

  const isPasswordLengthValid = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecialChar = SPECIAL_CHARS_REGEX.test(newPassword);
  const isDifferentFromCurrent = currentPassword !== "" && newPassword !== currentPassword;
  const doPasswordsMatch = newPassword !== "" && newPassword === confirmPassword;

  const isFormValid =
    isUsernameValid &&
    currentPassword.length > 0 &&
    isPasswordLengthValid &&
    hasUpperCase &&
    hasLowerCase &&
    hasDigit &&
    hasSpecialChar &&
    isDifferentFromCurrent &&
    doPasswordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.changeCredentials({
        current_password: currentPassword,
        new_username: newUsername.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      // Update storage and notify parent
      localStorage.setItem("megalodon_token", res.access_token);
      localStorage.setItem("megalodon_refresh_token", res.refresh_token);
      localStorage.setItem("sentinel_token", res.access_token);
      localStorage.setItem("sentinel_refresh_token", res.refresh_token);
      onSuccess(res);
    } catch (err: any) {
      setError(err.message || "Failed to update credentials. Please check your current password.");
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      data-modal-backdrop
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
      style={{ zIndex: 99999 }}
    >
      <div className="relative w-full max-w-lg my-auto rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-black p-6 sm:p-7 shadow-2xl space-y-6 text-zinc-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                Initial Account Setup
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/80">
                REQUIRED
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1 leading-relaxed">
              Security policy mandates changing your default username and password before entering the platform.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {/* Current Password */}
          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1.5 font-sans font-medium">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (e.g. admin123)"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-neutral-200"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Username */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-sans font-medium">
              <label className="text-zinc-700 dark:text-neutral-300">
                New Username *
              </label>
              <span className={`text-[10px] ${isUsernameValid ? "text-emerald-500" : "text-zinc-400 dark:text-neutral-500"}`}>
                {newUsername.length}/3+ chars
              </span>
            </div>
            <input
              type="text"
              required
              minLength={3}
              maxLength={64}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. sysadmin, sec_lead, john.doe"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
            />
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-neutral-400 font-sans">
              Minimum 3 characters. Only letters, numbers, hyphens, dots, and underscores.
            </p>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1.5 font-sans font-medium">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-neutral-200"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1.5 font-sans font-medium">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-10 rounded-lg bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-neutral-200"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Real-time Password Policy Checklist */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-neutral-900/60 border border-zinc-200 dark:border-neutral-800 space-y-1.5 font-sans">
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Security Policy Requirements
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${isUsernameValid ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {isUsernameValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Username 3+ chars</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isPasswordLengthValid ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {isPasswordLengthValid ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Password 8+ chars</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {hasUpperCase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>1 uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {hasLowerCase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>1 lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {hasDigit ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>1 number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>1 special symbol (!@#$...)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDifferentFromCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {isDifferentFromCurrent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Different from current</span>
              </div>
              <div className={`flex items-center gap-1.5 ${doPasswordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-neutral-500"}`}>
                {doPasswordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 font-sans">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-900 dark:text-neutral-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <span>Save & Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
