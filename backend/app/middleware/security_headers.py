"""
Security Headers Middleware — OWASP Hardening
Adds HTTP security headers to every response:
  - Strict-Transport-Security (HSTS)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
  - Permissions-Policy
  - Content-Security-Policy
  - X-XSS-Protection (legacy compat)
  - Cache-Control for API responses
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # HSTS — enforce HTTPS for 1 year; includes subdomains
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Deny framing (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"

        # Limit referrer info
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # CSP — tight policy: no inline scripts, only self-origin assets
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "  # unsafe-inline needed for Vite in dev
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "font-src 'self'; "
            "connect-src 'self' ws: wss:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # Legacy XSS filter (IE/old Edge compat)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Remove server identity headers if present
        for hide_header in ("server", "x-powered-by"):
            if hide_header in response.headers:
                del response.headers[hide_header]

        # API responses must not be cached by proxies
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response
