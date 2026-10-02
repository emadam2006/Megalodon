from app.gateway.client_ip import ClientIPDetector
from app.gateway.ssrf import SSRFProtection
from starlette.requests import Request


def test_trusted_proxy_client_ip_detection():
    detector = ClientIPDetector(trusted_proxies=["127.0.0.1", "10.0.0.0/8"])

    # Case 1: Direct client from untrusted public IP (should ignore forged X-Forwarded-For)
    scope_untrusted = {
        "type": "http",
        "client": ("203.0.113.195", 54321),
        "headers": [(b"x-forwarded-for", b"1.1.1.1")],
    }
    req_untrusted = Request(scope_untrusted)
    assert detector.get_client_ip(req_untrusted) == "203.0.113.195"

    # Case 2: Request from trusted proxy (should respect valid X-Forwarded-For)
    scope_trusted = {
        "type": "http",
        "client": ("10.0.0.5", 54321),
        "headers": [(b"x-forwarded-for", b"198.51.100.42, 10.0.0.5")],
    }
    req_trusted = Request(scope_trusted)
    assert detector.get_client_ip(req_trusted) == "198.51.100.42"


def test_ssrf_metadata_and_link_local_protection():
    # AWS/GCP/Azure link-local metadata IP must be strictly prohibited
    is_safe, msg = SSRFProtection.validate_target_url("http://169.254.169.254/latest/meta-data/")
    assert is_safe is False
    assert "metadata" in msg.lower() or "prohibited" in msg.lower()

    # IPv6 link-local blocked
    is_safe, msg = SSRFProtection.validate_target_url("http://[fe80::1]/")
    assert is_safe is False

    # Valid external HTTP target passes
    is_safe, msg = SSRFProtection.validate_target_url("http://example.com:80/api")
    assert is_safe is True
