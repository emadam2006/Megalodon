import React, { useState } from "react";
import { Shield, Lock, User, AlertCircle, ArrowRight, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.login({ username: username.trim(), password });
      localStorage.setItem("megalodon_token", data.access_token);
      localStorage.setItem("sentinel_token", data.access_token);
      onLoginSuccess();
      // Don't setLoading(false) — keep spinner showing until navigation completes
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black relative">

      {/* Full-screen loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50/80 dark:bg-black/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-zinc-200 dark:border-neutral-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
          <p className="mt-4 text-xs font-mono text-zinc-500 dark:text-neutral-400">Signing in…</p>
        </div>
      )}

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
          className="p-2 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800 transition-colors shadow-sm"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-neutral-300" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>
      </div>

      {/* Login Box with increased width (max-w-md = 448px instead of max-w-sm = 384px) */}
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 sm:p-10 shadow-xl dark:shadow-2xl space-y-6 transition-colors">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm">
            <Shield className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Megalodon</h1>
            <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
              API Security & Network Visibility Platform
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-neutral-900 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1.5 font-sans font-medium">Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400 dark:text-neutral-500" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-700 dark:text-neutral-300 mb-1.5 font-sans font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400 dark:text-neutral-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold font-sans text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? "Authenticating..." : "Continue"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
