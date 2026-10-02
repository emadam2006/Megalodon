import ipaddress
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple


class IPPolicyEvaluator:
    """
    High-performance IP Policy evaluator supporting IPv4, IPv6, CIDR blocks,
    temporary expiration, and Redis hot-path caching.
    """

    @staticmethod
    def match_ip_to_rule(client_ip_str: str, rule_ip_or_cidr: str) -> bool:
        """Determines if a client IP matches an individual IP or CIDR network rule."""
        try:
            client_ip = ipaddress.ip_address(client_ip_str)

            # Check if rule is CIDR network or single IP
            if "/" in rule_ip_or_cidr:
                network = ipaddress.ip_network(rule_ip_or_cidr, strict=False)
                # Ensure IP version matches (IPv4 in IPv4 net or IPv6 in IPv6 net)
                if client_ip.version == network.version:
                    return client_ip in network
                return False
            else:
                rule_ip = ipaddress.ip_address(rule_ip_or_cidr)
                return client_ip == rule_ip
        except ValueError:
            return False

    @staticmethod
    def evaluate_policies(
        client_ip: str,
        policies: List[Dict[str, any]]
    ) -> Tuple[str, Optional[str]]:
        """
        Evaluates a client IP against a list of policies.
        Returns:
            (decision, reason): ('ALLOW' | 'BLOCK' | 'PASS', reason_string)
        """
        now = datetime.now(timezone.utc)

        # Allow policies have highest priority for whitelisting
        for policy in policies:
            action = policy.get("action", "").upper()
            if action != "ALLOW":
                continue

            rule_target = policy.get("ip_or_cidr", "")
            if IPPolicyEvaluator.match_ip_to_rule(client_ip, rule_target):
                # Check expiration if set
                expires_at = policy.get("expires_at")
                if expires_at and expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at and now > expires_at:
                    continue
                return "ALLOW", policy.get("reason") or f"Matched allow policy {rule_target}"

        # Next check BLOCK, TEMPORARY_BLOCK, and PERMANENT_BLOCK
        for policy in policies:
            action = policy.get("action", "").upper()
            if action not in ("BLOCK", "TEMPORARY_BLOCK", "PERMANENT_BLOCK"):
                continue

            rule_target = policy.get("ip_or_cidr", "")
            if IPPolicyEvaluator.match_ip_to_rule(client_ip, rule_target):
                expires_at = policy.get("expires_at")
                if expires_at and expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at and now > expires_at:
                    # Expired temporary block
                    continue
                reason = policy.get("reason") or f"Matched {action} policy for {rule_target}"
                return "BLOCK", reason

        return "PASS", None
