import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, UserRole } from "../../context/AuthContext";
import { ShieldOff, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** At least one of these roles must be held by the current user */
  allowedRoles: UserRole[];
  /** Where to redirect if forbidden. Defaults to "/" (dashboard) */
  redirectTo?: string;
}

/**
 * Wraps a route and enforces role-based access.
 * - While auth is loading: shows a spinner
 * - If user lacks required role: shows 403 page (or redirects)
 * - Otherwise: renders children
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
}) => {
  const { isLoading, hasAnyRole, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 text-center px-4">
        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800">
          <ShieldOff className="w-10 h-10 text-zinc-400 dark:text-neutral-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Access Denied</h2>
          <p className="text-sm text-zinc-500 dark:text-neutral-400 mt-1 max-w-sm">
            You don't have permission to view this page.
            {allowedRoles.length > 0 && (
              <> Required role: <span className="font-mono font-medium text-zinc-700 dark:text-neutral-300">{allowedRoles.join(" / ")}</span></>
            )}
          </p>
        </div>
        <a
          href="/"
          className="text-xs font-medium px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-80"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
