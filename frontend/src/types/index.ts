export interface User {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  must_change_credentials?: boolean;
  roles: Array<{ id: string; name: string; description?: string }>;
  created_at: string;
}

export interface NetworkAddress {
  family: string;
  address: string;
  prefix: number;
}

export interface NetworkInterface {
  id?: string;
  name: string;
  state: "UP" | "DOWN" | "UNKNOWN";
  mac_address?: string;
  speed_mbps?: number;
  mtu?: number;
  addresses: NetworkAddress[];
  last_seen_at?: string;
}

export interface NetworkListener {
  id?: string;
  protocol: "TCP" | "UDP";
  bind_address: string;
  port: number;
  process_name?: string;
  pid?: number;
  command?: string;
  last_seen_at?: string;
}

export interface NetworkConnection {
  protocol: string;
  source_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  state: string;
  pid?: number;
  process_name?: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: "internet" | "interface" | "port" | "service" | "client";
  status: "normal" | "warning" | "error";
  details: Record<string, any>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  label?: string;
  traffic_rate?: number;
}

export interface TopologyMap {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface LiveRequestEntry {
  timestamp: string;
  request_id: string;
  client_ip: string;
  interface: string;
  destination_ip: string;
  destination_port: number;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  backend_service?: string;
  rate_limited: boolean;
  blocked: boolean;
  action_taken: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  requests: number;
  blocked: number;
  rate_limited: number;
  avg_latency_ms: number;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
  success_count?: number;
  error_count?: number;
  bandwidth_kb?: number;
}

export interface TopEntity {
  key: string;
  count: number;
  percentage: number;
}

export interface DashboardMetrics {
  total_requests: number;
  requests_per_second: number;
  blocked_requests: number;
  rate_limited_requests: number;
  unique_ips: number;
  unique_ports: number;
  open_ports_count: number;
  active_connections_count: number;
  error_rate_percentage: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  bandwidth_bytes_total?: number;
  bandwidth_kbps?: number;
  traffic_timeseries: TimeseriesPoint[];
  status_distribution: Record<string, number>;
  top_ips: TopEntity[];
  top_ports: TopEntity[];
  top_routes: TopEntity[];
}

export interface IPDetail {
  ip: string;
  status: string;
  interface: string;
  first_seen?: string;
  last_seen?: string;
  total_requests: number;
  blocked_requests: number;
  rate_limited_requests: number;
  error_count: number;
  avg_latency_ms: number;
  top_paths: TopEntity[];
  ports_accessed: number[];
  http_methods: Record<string, number>;
  status_codes: Record<string, number>;
  security_events: any[];
  recent_requests: LiveRequestEntry[];
}

export interface PortDetail {
  port: number;
  protocol: string;
  interface: string;
  bind_address: string;
  process_name?: string;
  pid?: number;
  command?: string;
  total_connections: number;
  active_connections: number;
  unique_source_ips: number;
  avg_latency_ms: number;
  error_rate: number;
  recent_connections: any[];
}

export interface IPPolicy {
  id: string;
  ip_or_cidr: string;
  action: "ALLOW" | "BLOCK" | "TEMPORARY_BLOCK" | "PERMANENT_BLOCK";
  expires_at?: string;
  reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitPolicy {
  id: string;
  name: string;
  algorithm: "FIXED_WINDOW" | "SLIDING_WINDOW" | "TOKEN_BUCKET";
  target_type: "IP" | "API_KEY" | "USER" | "ROUTE" | "GLOBAL";
  rate_limit: number;
  window_seconds: number;
  burst_capacity: number;
  created_at: string;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
  header_name?: string;
}

export interface SecurityRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  conditions_json: string;
  action: "ALLOW" | "BLOCK" | "RATE_LIMIT" | "TEMPORARY_BLOCK" | "RETURN_STATUS" | "CREATE_ALERT" | "LOG_EVENT";
  action_parameters_json?: string;
  is_enabled: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  source: string;
  metadata_json?: string;
  metadata?: any;
  created_at: string;
}

export interface BackendService {
  id: string;
  name: string;
  upstream_url: string;
  health_check_path: string;
  is_active: boolean;
  timeout_seconds: number;
  weight: number;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  path_prefix: string;
  methods: string;
  backend_service_id: string;
  strip_prefix: boolean;
  auth_required: boolean;
  rate_limit_policy_id?: string;
  created_at: string;
  backend_service?: BackendService;
}

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  permissions: string;
  rate_limit?: number;
  usage_count: number;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string;
  username?: string;
  action: string;
  resource: string;
  resource_id?: string;
  source_ip?: string;
  metadata_json?: string;
}
