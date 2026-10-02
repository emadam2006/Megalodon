const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("megalodon_token") || localStorage.getItem("sentinel_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Helps server distinguish XHR from browser-navigated requests (CSRF mitigation)
    "X-Requested-With": "XMLHttpRequest",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // On 401 (token expired/invalid) clear auth and redirect to login
  if (response.status === 401 && !endpoint.includes("/auth/login")) {
    localStorage.removeItem("megalodon_token");
    localStorage.removeItem("sentinel_token");
    window.dispatchEvent(new Event("auth:unauthorized"));
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.error || JSON.stringify(errJson);
    } catch (_) {}
    throw new ApiError(response.status, errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}


export const api = {
  // Auth
  login: (creds: { username: string; password: string }) =>
    request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(creds),
    }),
  getMe: () => request<any>("/auth/me"),
  changeCredentials: (data: {
    current_password: string;
    new_username: string;
    new_password: string;
    confirm_password: string;
  }) =>
    request<{ access_token: string; refresh_token: string; user: any }>("/auth/change-credentials", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Traffic & Analytics
  getMetrics: () => request<any>("/traffic/metrics"),
  getLiveRequests: (limit = 50) => request<any[]>(`/traffic/live?limit=${limit}`),
  getIPDetails: (ip: string) => request<any>(`/traffic/ip/${ip}`),
  getPortDetails: (port: number) => request<any>(`/traffic/port/${port}`),

  // Network Discovery
  getInterfaces: () => request<any[]>("/network/interfaces"),
  getPorts: () => request<any[]>("/network/ports"),
  getConnections: () => request<any[]>("/network/connections"),
  getRoutes: () => request<any[]>("/network/routes"),
  getProcesses: () => request<any[]>("/network/processes"),
  getTopologyMap: () => request<any>("/network/map"),

  // Security
  getIPPolicies: () => request<any[]>("/ip-policies"),
  createIPPolicy: (data: any) =>
    request<any>("/ip-policies", { method: "POST", body: JSON.stringify(data) }),
  deleteIPPolicy: (id: string) =>
    request<void>(`/ip-policies/${id}`, { method: "DELETE" }),

  getRateLimitPolicies: () => request<any[]>("/rate-limits"),
  createRateLimitPolicy: (data: any) =>
    request<any>("/rate-limits", { method: "POST", body: JSON.stringify(data) }),
  deleteRateLimitPolicy: (id: string) =>
    request<void>(`/rate-limits/${id}`, { method: "DELETE" }),

  getSecurityRules: () => request<any[]>("/security-rules"),
  createSecurityRule: (data: any) =>
    request<any>("/security-rules", { method: "POST", body: JSON.stringify(data) }),
  toggleSecurityRule: (id: string) =>
    request<any>(`/security-rules/${id}/toggle`, { method: "PATCH" }),
  deleteSecurityRule: (id: string) =>
    request<void>(`/security-rules/${id}`, { method: "DELETE" }),

  getSecurityEvents: (limit = 50) =>
    request<any[]>(`/security-events?limit=${limit}`),

  getAlerts: (limit = 50) => request<any[]>(`/alerts?limit=${limit}`),
  updateAlertStatus: (id: string, status: string) =>
    request<any>(`/alerts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Infrastructure
  getBackends: () => request<any[]>("/backends"),
  createBackend: (data: any) =>
    request<any>("/backends", { method: "POST", body: JSON.stringify(data) }),
  updateBackend: (id: string, data: any) =>
    request<any>(`/backends/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBackend: (id: string) =>
    request<void>(`/backends/${id}`, { method: "DELETE" }),

  getGatewayRoutes: () => request<any[]>("/routes"),
  createGatewayRoute: (data: any) =>
    request<any>("/routes", { method: "POST", body: JSON.stringify(data) }),
  deleteGatewayRoute: (id: string) =>
    request<void>(`/routes/${id}`, { method: "DELETE" }),

  getReadiness: () => request<any>("/ready"),
  getSystemStats: () =>
    request<{
      uptime_seconds: number;
      cpu_percent: number;
      memory_used_mb: number;
      memory_total_mb: number;
      memory_percent: number;
    }>("/system-stats"),
  getRawMetrics: () => request<{ metrics: string }>("/metrics/text"),

  // Access
  getUsers: () => request<any[]>("/users"),
  createUser: (data: any) =>
    request<any>("/users", { method: "POST", body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),

  getAPIKeys: () => request<any[]>("/api-keys"),
  createAPIKey: (data: any) =>
    request<any>("/api-keys", { method: "POST", body: JSON.stringify(data) }),
  revokeAPIKey: (id: string) =>
    request<void>(`/api-keys/${id}`, { method: "DELETE" }),

  getAuditLogs: (limit = 100) => request<any[]>(`/audit?limit=${limit}`),
};
