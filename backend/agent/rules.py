"""
Rule-Based Security Expert System for Lovely Professional University.
Encodes domain knowledge, curfew constraints, and campus security policies.
"""

from typing import List, Dict, Any


class SecurityRule:
    def __init__(self, rule_id: str, name: str, description: str, priority: int):
        self.rule_id = rule_id
        self.name = name
        self.description = description
        self.priority = priority

    def evaluate(self, context: Dict[str, Any]) -> Tuple_Evaluation:
        raise NotImplementedError


class Tuple_Evaluation:
    def __init__(self, triggered: bool, message: str, action: str = "NONE", modified_data: Dict[str, Any] = None):
        self.triggered = triggered
        self.message = message
        self.action = action
        self.modified_data = modified_data or {}


class CurfewEnforcementRule(SecurityRule):
    """Rule 1: Between 22:00 and 06:00, Hostel and perimeter gates become mandatory priority checkpoints."""
    def __init__(self):
        super().__init__(
            "RULE_001",
            "Night Curfew Perimeter Protocol",
            "Enforces enhanced surveillance on student hostels and perimeter access gates between 22:00 and 06:00.",
            priority=10
        )

    def evaluate(self, context: Dict[str, Any]) -> Tuple_Evaluation:
        hour = context.get("current_hour", 12)
        if hour >= 22 or hour <= 6:
            return Tuple_Evaluation(
                triggered=True,
                message="Night curfew active. Hostel perimeters (Z08, Z09) and Gate (Z01) require elevated priority check.",
                action="ELEVATE_PRIORITY",
                modified_data={"mandatory_zones": ["Z01", "Z08", "Z09"]}
            )
        return Tuple_Evaluation(triggered=False, message="Normal daytime hours.")


class CriticalIncidentDispatchRule(SecurityRule):
    """Rule 2: Any zone with an active incident severity >= 4 requires immediate inclusion in patrol."""
    def __init__(self):
        super().__init__(
            "RULE_002",
            "Critical Incident Mandatory Dispatch",
            "Ensures any active code red/high severity event triggers mandatory patrol visitation.",
            priority=100
        )

    @staticmethod
    def _parse_severity(sev) -> float:
        if isinstance(sev, (int, float)):
            return float(sev)
        sev_map = {"LOW": 1, "MEDIUM": 3, "HIGH": 4, "CRITICAL": 5}
        return float(sev_map.get(str(sev).upper(), 1))

    def evaluate(self, context: Dict[str, Any]) -> Tuple_Evaluation:
        active_incidents = context.get("active_incidents", [])
        critical_zones = [
            inc["zone_id"] for inc in active_incidents
            if self._parse_severity(inc.get("severity", 1)) >= 4 and inc.get("status") in ["ACTIVE", "INVESTIGATING"]
        ]
        if critical_zones:
            return Tuple_Evaluation(
                triggered=True,
                message=f"Urgent incidents active in zones: {', '.join(critical_zones)}. Prioritizing immediate route rerouting.",
                action="MANDATORY_VISIT",
                modified_data={"mandatory_zones": critical_zones}
            )
        return Tuple_Evaluation(triggered=False, message="No critical incidents exceeding threshold.")


class RestrictedAreaExclusionRule(SecurityRule):
    """Rule 3: Exclude any zone or path marked as locked down or hazardous."""
    def __init__(self):
        super().__init__(
            "RULE_003",
            "Restricted Zone Safety Barrier",
            "Prevents patrol agents from entering officially locked down or hazardous zones without tactical backup.",
            priority=90
        )

    def evaluate(self, context: Dict[str, Any]) -> Tuple_Evaluation:
        zones = context.get("zones", [])
        locked_down = [z["zone_id"] for z in zones if z.get("is_restricted", False)]
        if locked_down:
            return Tuple_Evaluation(
                triggered=True,
                message=f"Zones {', '.join(locked_down)} are restricted. Route planning will bypass these locations.",
                action="EXCLUDE_ZONES",
                modified_data={"excluded_zones": locked_down}
            )
        return Tuple_Evaluation(triggered=False, message="All zones are accessible.")


class SecurityRuleEngine:
    """Evaluates the set of domain rules against the campus operational state."""

    def __init__(self):
        self.rules: List[SecurityRule] = [
            CurfewEnforcementRule(),
            CriticalIncidentDispatchRule(),
            RestrictedAreaExclusionRule(),
        ]

    def evaluate_all(self, context: Dict[str, Any]) -> Dict[str, Any]:
        triggered_rules = []
        mandatory_zones: List[str] = []
        excluded_zones: List[str] = []

        for rule in self.rules:
            res = rule.evaluate(context)
            if res.triggered:
                triggered_rules.append({
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "message": res.message,
                    "action": res.action,
                })
                if "mandatory_zones" in res.modified_data:
                    mandatory_zones.extend(res.modified_data["mandatory_zones"])
                if "excluded_zones" in res.modified_data:
                    excluded_zones.extend(res.modified_data["excluded_zones"])

        return {
            "triggered_rules": triggered_rules,
            "mandatory_zones": list(set(mandatory_zones)),
            "excluded_zones": list(set(excluded_zones)),
        }
