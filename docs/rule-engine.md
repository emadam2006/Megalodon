# Security Rule Engine

Megalodon includes a zero-overhead, multi-attribute policy evaluation engine.

---

## 1. Syntax & Logical Structure

Security rules follow the pattern:
```text
IF condition
AND condition
THEN action
```

Rules are evaluated in ascending **priority** order (priority `1` is evaluated before priority `100`). The first matching rule executes its defined action.

---

## 2. Supported Conditions

| Field | Description | Supported Operators |
|---|---|---|
| `ip` / `client_ip` | Client IP address | `equals`, `not_equals` |
| `cidr` | Subnet matching | `in_cidr` |
| `method` | HTTP verb | `equals`, `not_equals` |
| `path` | Request URI | `starts_with`, `ends_with`, `contains`, `regex`, `equals` |
| `header` | Custom HTTP header | `equals`, `contains`, `regex` |
| `user_agent` | Client User-Agent | `contains`, `regex` |
| `request_rate` | Current request rate | `greater_than`, `less_than`, `greater_than_or_equal` |
| `port` | Destination listening port | `equals` |

---

## 3. Supported Actions

- `ALLOW`: Immediately passes request without further rule evaluation.
- `BLOCK`: Rejects request immediately with HTTP 403 Forbidden.
- `TEMPORARY_BLOCK`: Adds client IP to Redis temporary quarantine for specified duration.
- `RATE_LIMIT`: Enforces immediate rate throttling.
- `RETURN_STATUS`: Returns custom HTTP status code (e.g. 404, 418).
- `CREATE_ALERT`: Emits high-priority platform security alert to WebSockets and Kafka.
- `LOG_EVENT`: Records security event without interrupting traffic flow.
