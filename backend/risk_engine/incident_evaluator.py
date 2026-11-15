"""
Incident Evaluator for Campus Security.
Aggregates, filters, and correlates simulated security events across LPU zones.
"""

from typing import List, Dict, Any
from datetime import datetime, timezone


class IncidentEvaluator:
    """Evaluates the severity and impact radius of campus incidents."""

    SEVERITY_DESCRIPTIONS = {
        1: "Minor / Low Priority (Informational)",
        2: "Notice / Precautionary Check",
        3: "Moderate Security Concern",
        4: "High Risk / Active Intervention Required",
        5: "Critical Emergency / Code Red",
    }

    @staticmethod
    def filter_active_for_zone(incidents: List[Dict[str, Any]], zone_id: str) -> List[Dict[str, Any]]:
        return [
            inc for inc in incidents
            if inc.get("zone_id") == zone_id and inc.get("status") in ["ACTIVE", "INVESTIGATING"]
        ]

    @staticmethod
    def get_max_incident_severity(incidents: List[Dict[str, Any]], zone_id: str) -> int:
        zone_incidents = IncidentEvaluator.filter_active_for_zone(incidents, zone_id)
        if not zone_incidents:
            return 0
        return max(inc.get("severity", 1) for inc in zone_incidents)

    @staticmethod
    def create_simulated_incident(
        incident_id: str,
        zone_id: str,
        zone_name: str,
        category: str,
        severity: int,
        description: str
    ) -> Dict[str, Any]:
        return {
            "incident_id": incident_id,
            "zone_id": zone_id,
            "zone_name": zone_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "category": category,
            "severity": max(1, min(5, severity)),
            "status": "ACTIVE",
            "description": description,
            "is_simulated": True,
        }
