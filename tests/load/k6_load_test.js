import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metric trends for observability
const rateLimitedCount = new Rate('rate_limited_ratio');
const gatewayLatency = new Trend('megalodon_gateway_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm up
    { duration: '1m', target: 100 },   // Normal load
    { duration: '30s', target: 300 },  // High traffic stress
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150', 'p(99)<300'], // 95% of requests within 150ms, 99% within 300ms
    http_req_failed: ['rate<0.05'],                 // Failure rate < 5%
  },
};

const BASE_URL = __ENV.MEGALODON_GATEWAY_URL || __ENV.SENTINEL_GATEWAY_URL || 'http://localhost:8080';

export default function () {
  // Generate random simulated client IP for distributed testing
  const octet3 = Math.floor(Math.random() * 254) + 1;
  const octet4 = Math.floor(Math.random() * 254) + 1;
  const simulatedIp = `198.51.${octet3}.${octet4}`;

  const params = {
    headers: {
      'User-Agent': 'k6-load-runner/1.0',
      'X-Forwarded-For': simulatedIp,
      'Accept': 'application/json',
    },
  };

  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/health`, params);
  const latency = Date.now() - startTime;

  gatewayLatency.add(latency);

  // Rate limiting check
  if (res.status === 429) {
    rateLimitedCount.add(1);
  } else {
    rateLimitedCount.add(0);
  }

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'has request-id header': (r) => r.headers['X-Megalodon-Request-Id'] !== undefined || r.headers['X-Sentinel-Request-Id'] !== undefined,
  });

  sleep(0.1);
}
