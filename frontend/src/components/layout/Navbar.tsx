import React from "react";
import { Shield, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

interface NavbarProps {
  wsConnected: boolean;
  reqCount?: number;
  blockedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, roles, logout } = useAuth();

  // Determine highest role for display (lowercase: admin / operator / viewer)
  const primaryRole = roles.includes("ADMIN") || user?.is_superuser
    ? "ADMIN"
    : roles.includes("OPERATOR")
    ? "OPERATOR"
    : roles.includes("VIEWER")
    ? "VIEWER"
    : null;

  return (
    <header className="sticky top-0 z-40 w-full h-14 flex-shrink-0 border-b border-zinc-200 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm">
            <Shield className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-white">
                MEGALODON
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-600 dark:text-neutral-400 border border-zinc-200 dark:border-neutral-800">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Status Badges & Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-500" : "bg-zinc-400 dark:bg-neutral-600"
              }`}
            ></span>
            <span className="font-mono text-xs text-zinc-700 dark:text-neutral-300">
              {wsConnected ? "STREAM ACTIVE" : "CONNECTING"}
            </span>
          </div>

          {/* User info + role */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800">
              <span className="text-xs text-zinc-800 dark:text-neutral-200 font-medium">
                {user.username}
              </span>
              {primaryRole && primaryRole.toLowerCase() !== user.username.toLowerCase() && (
                <>
                  <span className="text-zinc-300 dark:text-neutral-600 text-xs">·</span>
                  <span className="text-[11px] text-zinc-500 dark:text-neutral-400">
                    {primaryRole.toLowerCase()}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Theme Switcher & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-neutral-800"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-neutral-300" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )}
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-neutral-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
