import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useWebSocket } from "./hooks/useWebSocket";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { InterfacesPage } from "./pages/network/InterfacesPage";
import { PortsPage } from "./pages/network/PortsPage";
import { ConnectionsPage } from "./pages/network/ConnectionsPage";
import { NetworkMapPage } from "./pages/network/NetworkMapPage";
import { LiveTrafficPage } from "./pages/traffic/LiveTrafficPage";
import { HistoryPage } from "./pages/traffic/HistoryPage";
import { AnalyticsPage } from "./pages/traffic/AnalyticsPage";
import { IPPoliciesPage } from "./pages/security/IPPoliciesPage";
import { SecurityRulesPage } from "./pages/security/SecurityRulesPage";
import { SecurityEventsPage } from "./pages/security/SecurityEventsPage";
import { AlertsPage } from "./pages/security/AlertsPage";
import { BackendsPage } from "./pages/infrastructure/BackendsPage";
import { HealthPage } from "./pages/infrastructure/HealthPage";
import { UsersPage } from "./pages/access/UsersPage";
import { APIKeysPage } from "./pages/access/APIKeysPage";
import { AuditLogsPage } from "./pages/access/AuditLogsPage";
import { ObservabilityPage } from "./pages/system/ObservabilityPage";
import { SettingsPage } from "./pages/system/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { FirstLoginModal } from "./components/modals/FirstLoginModal";

/** Inner shell — rendered only when authenticated */
const AppShell: React.FC = () => {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const {
    isConnected,
    liveRequests,
    isPaused,
    togglePause,
    clearRequests,
  } = useWebSocket();

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout]);

  // While AuthContext is fetching /me, show a loading spinner instead of
  // redirecting to login (which would cause an infinite loop if token exists)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-white dark:bg-black">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-neutral-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Enforce mandatory credential update on first login before accessing dashboard
  if (user.must_change_credentials) {
    return (
      <FirstLoginModal
        user={user}
        onSuccess={async () => {
          await refreshUser();
        }}
        onLogout={logout}
      />
    );
  }

  const blockedCount = liveRequests.filter((r) => r.blocked).length;

  return (
    <div className="h-screen max-h-screen flex flex-col bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black overflow-hidden">
      <Navbar
        wsConnected={isConnected}
        reqCount={liveRequests.length}
        blockedCount={blockedCount}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 min-h-0 h-full overflow-y-auto p-6 lg:p-8 bg-zinc-50/60 dark:bg-black">
          <Routes>
            {/* ── Overview ─────────────────────────────────────── */}
            <Route
              path="/"
              element={<DashboardPage liveRequests={liveRequests} wsConnected={isConnected} />}
            />

            {/* ── Network Visibility (all roles) ───────────────── */}
            <Route path="/network/interfaces" element={<InterfacesPage />} />
            <Route path="/network/ports" element={<PortsPage />} />
            <Route path="/network/connections" element={<ConnectionsPage />} />
            <Route path="/network/map" element={<NetworkMapPage />} />

            {/* ── Traffic Management (all roles) ───────────────── */}
            <Route
              path="/traffic/live"
              element={
                <LiveTrafficPage
                  liveRequests={liveRequests}
                  isPaused={isPaused}
                  togglePause={togglePause}
                  clearRequests={clearRequests}
                  wsConnected={isConnected}
                />
              }
            />
            <Route path="/traffic/history" element={<HistoryPage />} />
            <Route path="/traffic/analytics" element={<AnalyticsPage />} />

            {/* ── Security & Firewall (all roles can read) ─────── */}
            <Route path="/security/ip-policies" element={<IPPoliciesPage />} />
            <Route path="/security/rules" element={<SecurityRulesPage />} />
            <Route path="/security/events" element={<SecurityEventsPage />} />
            <Route path="/security/alerts" element={<AlertsPage />} />

            {/* ── Infrastructure (all roles can read) ──────────── */}
            <Route path="/infrastructure/backends" element={<BackendsPage />} />
            <Route path="/infrastructure/health" element={<HealthPage />} />

            {/* ── Access Control (ADMIN only) ───────────────────── */}
            <Route
              path="/access/users"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/access/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* ── API Keys (ADMIN + OPERATOR) ───────────────────── */}
            <Route
              path="/access/api-keys"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
                  <APIKeysPage />
                </ProtectedRoute>
              }
            />

            {/* ── System (ADMIN + OPERATOR for observability, ADMIN for settings) */}
            <Route
              path="/system/observability"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
                  <ObservabilityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system/settings"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("megalodon_token") || localStorage.getItem("sentinel_token")
  );

  // When AuthContext (or any code) fires auth:unauthorized (logout), clear our token
  // state so the route guard immediately flips to /login without a page refresh.
  useEffect(() => {
    const handleUnauthorized = () => setToken(null);
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const handleLoginSuccess = () => {
    setToken(localStorage.getItem("megalodon_token") || localStorage.getItem("sentinel_token"));
    // Trigger storage event for AuthContext to re-fetch /me
    window.dispatchEvent(new StorageEvent("storage", { key: "megalodon_token" }));
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              token ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/*"
            element={
              !token ? (
                <Navigate to="/login" replace />
              ) : (
                <AppShell />
              )
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
