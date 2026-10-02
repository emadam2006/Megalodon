from datetime import datetime, timedelta, timezone

from app.firewall.ip_filter import IPPolicyEvaluator


def test_ip_exact_matching():
    assert IPPolicyEvaluator.match_ip_to_rule("192.168.1.50", "192.168.1.50") is True
    assert IPPolicyEvaluator.match_ip_to_rule("192.168.1.51", "192.168.1.50") is False
    assert IPPolicyEvaluator.match_ip_to_rule("2001:db8::1", "2001:db8::1") is True
    assert IPPolicyEvaluator.match_ip_to_rule("2001:db8::2", "2001:db8::1") is False


def test_cidr_network_matching():
    # IPv4 CIDR
    assert IPPolicyEvaluator.match_ip_to_rule("10.5.20.1", "10.0.0.0/8") is True
    assert IPPolicyEvaluator.match_ip_to_rule("192.168.1.1", "10.0.0.0/8") is False
    assert IPPolicyEvaluator.match_ip_to_rule("172.16.5.10", "172.16.0.0/12") is True
    assert IPPolicyEvaluator.match_ip_to_rule("172.32.0.1", "172.16.0.0/12") is False

    # IPv6 CIDR
    assert IPPolicyEvaluator.match_ip_to_rule("2001:db8::1", "2001:db8::/32") is True
    assert IPPolicyEvaluator.match_ip_to_rule("2001:db9::1", "2001:db8::/32") is False


def test_policy_evaluation_allow_and_block():
    policies = [
        {"ip_or_cidr": "1.2.3.4", "action": "BLOCK", "reason": "Abusive IP"},
        {"ip_or_cidr": "10.0.0.0/8", "action": "ALLOW", "reason": "Internal VPC"},
        {"ip_or_cidr": "5.6.7.8", "action": "TEMPORARY_BLOCK", "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)},
        {"ip_or_cidr": "9.9.9.9", "action": "TEMPORARY_BLOCK", "expires_at": datetime.now(timezone.utc) - timedelta(minutes=10)}, # Expired
    ]

    # Blocked specific IP
    decision, reason = IPPolicyEvaluator.evaluate_policies("1.2.3.4", policies)
    assert decision == "BLOCK"
    assert "Abusive IP" in reason

    # Allowed CIDR
    decision, reason = IPPolicyEvaluator.evaluate_policies("10.1.2.3", policies)
    assert decision == "ALLOW"

    # Temporary block active
    decision, reason = IPPolicyEvaluator.evaluate_policies("5.6.7.8", policies)
    assert decision == "BLOCK"

    # Temporary block expired -> PASS
    decision, reason = IPPolicyEvaluator.evaluate_policies("9.9.9.9", policies)
    assert decision == "PASS"

    # Unmatched IP -> PASS
    decision, reason = IPPolicyEvaluator.evaluate_policies("8.8.8.8", policies)
    assert decision == "PASS"
