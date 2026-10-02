import json

from app.rules.engine import RuleEngine


def test_rule_condition_matching():
    context = {
        "client_ip": "1.2.3.4",
        "method": "POST",
        "path": "/api/login",
        "route_name": "auth-route",
        "destination_port": 443,
        "request_rate": 15.0,
        "headers": {"user-agent": "sqlmap/1.4", "x-custom-sec": "strict"},
    }

    # IP equals
    assert RuleEngine.evaluate_condition({"field": "ip", "operator": "equals", "value": "1.2.3.4"}, context) is True
    assert RuleEngine.evaluate_condition({"field": "ip", "operator": "equals", "value": "5.5.5.5"}, context) is False

    # Path starts_with
    assert RuleEngine.evaluate_condition({"field": "path", "operator": "starts_with", "value": "/api"}, context) is True
    assert RuleEngine.evaluate_condition({"field": "path", "operator": "starts_with", "value": "/admin"}, context) is False

    # Method equals
    assert RuleEngine.evaluate_condition({"field": "method", "operator": "equals", "value": "POST"}, context) is True
    assert RuleEngine.evaluate_condition({"field": "method", "operator": "equals", "value": "GET"}, context) is False

    # Rate comparison
    assert RuleEngine.evaluate_condition({"field": "request_rate", "operator": "greater_than", "value": "10"}, context) is True
    assert RuleEngine.evaluate_condition({"field": "request_rate", "operator": "less_than", "value": "10"}, context) is False

    # Header regex matching scanner User-Agent
    assert RuleEngine.evaluate_condition({"field": "header", "header_name": "user-agent", "operator": "regex", "value": "sqlmap"}, context) is True


def test_chained_rule_evaluation():
    rule = {
        "id": "rule-1",
        "name": "Block Brute Force Login",
        "priority": 10,
        "conditions": json.dumps([
            {"field": "path", "operator": "equals", "value": "/api/login"},
            {"field": "method", "operator": "equals", "value": "POST"},
            {"field": "request_rate", "operator": "greater_than", "value": "10"},
        ]),
        "action": "TEMPORARY_BLOCK",
        "action_parameters": json.dumps({"duration_minutes": 30}),
        "is_enabled": True,
    }

    matching_context = {
        "path": "/api/login",
        "method": "POST",
        "request_rate": 15.0,
        "client_ip": "1.2.3.4",
    }
    non_matching_context = {
        "path": "/api/login",
        "method": "POST",
        "request_rate": 5.0, # Below threshold
        "client_ip": "1.2.3.4",
    }

    result_match = RuleEngine.evaluate_all([rule], matching_context)
    assert result_match is not None
    assert result_match.matched is True
    assert result_match.action == "TEMPORARY_BLOCK"
    assert result_match.action_parameters.get("duration_minutes") == 30

    result_non_match = RuleEngine.evaluate_all([rule], non_matching_context)
    assert result_non_match is None
