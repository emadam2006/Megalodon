# Distributed Rate Limiting

Megalodon uses Redis to provide cluster-wide, sub-millisecond distributed rate limiting across all gateway instances.

---

## 1. Supported Rate Limiting Algorithms

1. **Sliding Window (Recommended)**
   - High-precision sliding timestamp counter.
   - Prevents traffic spikes at window boundaries.
2. **Fixed Window**
   - Atomic Redis `INCR` + `EXPIRE` bucket.
   - Low overhead for high-throughput generic limits.
3. **Token Bucket**
   - Supports burst capacity while enforcing a steady continuous refill rate.

---

## 2. Policy Targets

Rate limits can target:
- **Client IP**: Distributed per IPv4 or IPv6 address.
- **API Key**: Associated directly with cryptographic client keys.
- **User**: Authenticated user identity.
- **Route**: Specific microservice route prefix.
- **Global**: Overall platform ingress capacity.

---

## 3. Standard Response Headers

When rate limits are evaluated, the Megalodon Gateway injects RFC-compliant HTTP headers:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1727823600
Retry-After: 42
Content-Type: application/json

{
  "error": "Too Many Requests",
  "retry_after": 42,
  "limit": 100
}
```
