import React, { useEffect, useState } from "react";
import { Server, Plus, Trash2, RefreshCw, Route as RouteIcon } from "lucide-react";
import { api } from "../../api/client";
import { useConfirm } from "../../components/modals/ConfirmModal";
import { BackendService, Route } from "../../types";

export const BackendsPage: React.FC = () => {
  const [backends, setBackends] = useState<BackendService[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, confirmDialog } = useConfirm();

  // New Backend Form State
  const [newBackendName, setNewBackendName] = useState("");
  const [newUpstreamUrl, setNewUpstreamUrl] = useState("");
  const [newHealthCheck, setNewHealthCheck] = useState("/health");

  // New Route Form State
  const [newRouteName, setNewRouteName] = useState("");
  const [newRoutePrefix, setNewRoutePrefix] = useState("");
  const [newRouteMethods, setNewRouteMethods] = useState("ALL");
  const [newRouteBackendId, setNewRouteBackendId] = useState("");
  const [newRouteStrip, setNewRouteStrip] = useState(false);
  const [newRouteAuth, setNewRouteAuth] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getBackends(), api.getGatewayRoutes()])
      .then(([b, r]) => {
        const backendsList = Array.isArray(b) ? b : [];
        const routesList = Array.isArray(r) ? r : [];
        setBackends(backendsList);
        setRoutes(routesList);
        if (backendsList.length > 0 && !newRouteBackendId) {
          setNewRouteBackendId(backendsList[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBackend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBackend({
        name: newBackendName.trim(),
        upstream_url: newUpstreamUrl.trim(),
        health_check_path: newHealthCheck.trim() || "/health",
      });
      setNewBackendName("");
      setNewUpstreamUrl("");
      fetchData();
    } catch (err: any) {
      alert("Failed to add backend: " + err.message);
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGatewayRoute({
        name: newRouteName.trim(),
        path_prefix: newRoutePrefix.trim(),
        methods: newRouteMethods,
        backend_service_id: newRouteBackendId,
        strip_prefix: newRouteStrip,
        auth_required: newRouteAuth,
      });
      setNewRouteName("");
      setNewRoutePrefix("");
      fetchData();
    } catch (err: any) {
      alert("Failed to create route: " + err.message);
    }
  };

  const handleDeleteBackend = async (backend: BackendService) => {
    const ok = await confirm({
      title: "Delete Backend Service?",
      message: `Are you sure you want to permanently delete upstream service "${backend.name}"? Gateway routes targeting this service will fail unless updated.`,
      itemName: `${backend.name} (${backend.upstream_url})`,
      confirmText: "Delete Backend",
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await api.deleteBackend(backend.id);
      fetchData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteRoute = async (route: Route) => {
    const ok = await confirm({
      title: "Delete Gateway Route?",
      message: `Are you sure you want to permanently delete gateway route "${route.name}"? Incoming traffic matching path prefix "${route.path_prefix}" will no longer be forwarded.`,
      itemName: `${route.name} → ${route.path_prefix}`,
      confirmText: "Delete Route",
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await api.deleteGatewayRoute(route.id);
      fetchData();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-5 h-5 text-zinc-900 dark:text-white" />
            <span>Upstream Backends & Gateway Routes</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">
            Configure upstream microservice targets, path prefixes, and reverse proxy forwarding
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-neutral-900 hover:bg-zinc-100 dark:hover:bg-neutral-800 border border-zinc-200 dark:border-neutral-800 text-zinc-700 dark:text-neutral-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Upstream Backends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Configured Upstream Targets</h3>
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Backend Name</th>
                  <th className="px-5 py-3">Upstream Target URL</th>
                  <th className="px-5 py-3">Health Path</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
                {backends.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{b.name}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300 select-all font-mono">
                      {b.upstream_url}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 dark:text-neutral-400 font-mono">{b.health_check_path}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono border bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
                        {b.is_active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteBackend(b)}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete backend"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {backends.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-400 dark:text-neutral-500">
                      No upstream backends registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Backend Form */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Register Target Backend</h3>
          <form onSubmit={handleCreateBackend} className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Service Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. auth-service"
                value={newBackendName}
                onChange={(e) => setNewBackendName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Target Upstream URL *</label>
              <input
                type="url"
                required
                placeholder="http://10.0.0.5:8000"
                value={newUpstreamUrl}
                onChange={(e) => setNewUpstreamUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Health Check Path</label>
              <input
                type="text"
                placeholder="/health"
                value={newHealthCheck}
                onChange={(e) => setNewHealthCheck(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold font-sans text-xs transition-colors shadow-sm"
            >
              Register Backend
            </button>
          </form>
        </div>
      </div>

      {/* Routes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Gateway Routing Table</h3>
          <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-50 dark:bg-neutral-900/60 text-zinc-500 dark:text-neutral-400 border-b border-zinc-200 dark:border-neutral-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Route Name</th>
                  <th className="px-5 py-3">Path Prefix</th>
                  <th className="px-5 py-3">Methods</th>
                  <th className="px-5 py-3">Target Upstream</th>
                  <th className="px-5 py-3">Auth</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-neutral-900 text-zinc-800 dark:text-neutral-200">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-white">{r.name}</td>
                    <td className="px-5 py-3 text-zinc-900 dark:text-white font-mono select-all">
                      {r.path_prefix}
                    </td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300">{r.methods}</td>
                    <td className="px-5 py-3 text-zinc-700 dark:text-neutral-300">
                      {r.backend_service?.name || r.backend_service_id}
                    </td>
                    <td className="px-5 py-3">
                      {r.auth_required ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-900 border border-zinc-300 dark:bg-white/10 dark:text-white dark:border-white/20">
                          REQUIRED
                        </span>
                      ) : (
                        <span className="text-zinc-500 dark:text-neutral-500">PUBLIC</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRoute(r)}
                        className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-neutral-800 text-zinc-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {routes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400 dark:text-neutral-500">
                      No routing prefixes mapped.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Route Form */}
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Create Gateway Route</h3>
          <form onSubmit={handleCreateRoute} className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Route Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Users API Route"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Path Prefix *</label>
              <input
                type="text"
                required
                placeholder="e.g. /api/users"
                value={newRoutePrefix}
                onChange={(e) => setNewRoutePrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-neutral-400 mb-1 font-sans">Target Backend *</label>
              <select
                value={newRouteBackendId}
                onChange={(e) => setNewRouteBackendId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-white transition-colors"
              >
                {backends.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.upstream_url})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-neutral-300 font-sans">
                <input
                  type="checkbox"
                  checked={newRouteStrip}
                  onChange={(e) => setNewRouteStrip(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-neutral-800"
                />
                <span>Strip Prefix</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-neutral-300 font-sans">
                <input
                  type="checkbox"
                  checked={newRouteAuth}
                  onChange={(e) => setNewRouteAuth(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-neutral-800"
                />
                <span>Require Auth</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={backends.length === 0}
              className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-semibold font-sans text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              Deploy Route
            </button>
          </form>
        </div>
      </div>

      {confirmDialog}
    </div>
  );
};
