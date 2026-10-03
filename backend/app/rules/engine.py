import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.firewall.ip_filter import IPPolicyEvaluator


@dataclass
class RuleEvaluationResult:
    matched: bool
    rule_id: Optional[str]
    rule_name: Optional[str]
    action: str  # ALLOW, BLOCK, RATE_LIMIT, TEMPORARY_BLOCK, RETURN_STATUS, CREATE_ALERT, LOG_EVENT
    action_parameters: Dict[str, Any]
    reason: str


class RuleEngine:
    @staticmethod
    def evaluate_condition(condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
        field = condition.get("field", "").lower()
        operator = condition.get("operator", "equals").lower()
        target_value = str(condition.get("value", ""))

        # Resolve actual value from request context
        actual_value = ""
        if field == "ip" or field == "client_ip":
            actual_value = str(context.get("client_ip", ""))
        elif field == "cidr":
            return IPPolicyEvaluator.match_ip_to_rule(str(context.get("client_ip", "")), target_value)
        elif field == "method":
            actual_value = str(context.get("method", "")).upper()
            target_value = target_value.upper()
        elif field == "path":
            actual_value = str(context.get("path", ""))
        elif field == "route":
            actual_value = str(context.get("route_name", ""))
        elif field == "status" or field == "status_code":
            actual_value = str(context.get("status_code", ""))
        elif field == "user_agent":
            actual_value = str(context.get("user_agent", ""))
        elif field == "api_key":
            actual_value = str(context.get("api_key_prefix", ""))
        elif field == "user":
            actual_value = str(context.get("username", ""))
        elif field == "interface":
            actual_value = str(context.get("interface", "eth0"))
        elif field == "port" or field == "destination_port":
            actual_value = str(context.get("destination_port", ""))
        elif field == "backend":
            actual_value = str(context.get("backend_service", ""))
        elif field == "header":
            header_name = condition.get("header_name", "").lower()
            headers = context.get("headers", {})
            actual_value = str(headers.get(header_name, ""))
        elif field == "query_param":
            param_name = condition.get("header_name", "")  # or param name
            query_params = context.get("query_params", {})
            actual_value = str(query_params.get(param_name, ""))
        elif field == "request_rate":
            actual_rate = float(context.get("request_rate", 0))
            try:
                target_rate = float(target_value)
                if operator in (">", "greater_than"):
                    return actual_rate > target_rate
                if operator in ("<", "less_than"):
                    return actual_rate < target_rate
                if operator in (">=", "greater_than_or_equal"):
                    return actual_rate >= target_rate
            except ValueError:
                return False

        # General string and regex evaluations
        if operator in ("equals", "=="):
            return actual_value.lower() == target_value.lower()
        elif operator in ("not_equals", "!="):
            return actual_value.lower() != target_value.lower()
        elif operator == "contains":
            return target_value.lower() in actual_value.lower()
        elif operator == "starts_with":
            return actual_value.lower().startswith(target_value.lower())
        elif operator == "ends_with":
            return actual_value.lower().endswith(target_value.lower())
        elif operator == "regex":
            try:
                return bool(re.search(target_value, actual_value, re.IGNORECASE))
            except re.error:
                return False
        elif operator == "in_cidr":
            return IPPolicyEvaluator.match_ip_to_rule(actual_value, target_value)

        return False

    @staticmethod
    def evaluate_rule(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Evaluates whether all conditions of a rule match (AND logic)."""
        conditions = rule.get("conditions", [])
        if isinstance(conditions, str):
            try:
                conditions = json.loads(conditions)
            except Exception:
                conditions = []

        if not conditions:
            return False

        # All conditions must evaluate to True (AND condition)
        for condition in conditions:
            if not RuleEngine.evaluate_condition(condition, context):
                return False

        return True

    @staticmethod
    def evaluate_all(rules: List[Dict[str, Any]], context: Dict[str, Any]) -> Optional[RuleEvaluationResult]:
        """
        Evaluates sorted rules by priority (lowest priority number = evaluated first).
        Returns the first matching rule evaluation result or None.
        """
        # Sort rules by priority ascending
        sorted_rules = sorted(rules, key=lambda r: r.get("priority", 100))

        for rule in sorted_rules:
            if not rule.get("is_enabled", True):
                continue

            if RuleEngine.evaluate_rule(rule, context):
                action = rule.get("action", "LOG_EVENT").upper()
                action_params = rule.get("action_parameters", {})
                if isinstance(action_params, str):
                    try:
                        action_params = json.loads(action_params)
                    except Exception:
                        action_params = {}

                return RuleEvaluationResult(
                    matched=True,
                    rule_id=rule.get("id"),
                    rule_name=rule.get("name"),
                    action=action,
                    action_parameters=action_params or {},
                    reason=f"Matched security rule '{rule.get('name')}'"
                )

        return None
