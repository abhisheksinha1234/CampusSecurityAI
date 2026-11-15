"""
Multi-Factor Risk Classification Engine for Lovely Professional University.
Evaluates 8 distinct factors to produce an explainable risk score (0-100),
categorical classification, and confidence indicator.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Tuple, List


class RiskClassifier:
    """
    Deterministic, transparent 8-factor risk scoring engine.
    Weights sum to 100% (1.0).
    """

    WEIGHTS = {
        "historical_incidents": 0.15,
        "active_incident_severity": 0.25,
        "patrol_neglect": 0.20,
        "base_priority": 0.15,
        "time_of_day": 0.10,
        "crowd_density": 0.05,
        "active_alerts": 0.10,
    }

    # Classification thresholds
    LOW_THRESHOLD = 25.0
    MEDIUM_THRESHOLD = 55.0
    HIGH_THRESHOLD = 80.0

    @classmethod
    def evaluate_zone_risk(
        cls,
        zone: Dict[str, Any],
        active_incidents: List[Dict[str, Any]] = None,
        current_hour: int = None,
        environmental_alerts_count: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates normalized risk score (0-100), risk tier, color, and factor breakdown.
        """
        active_incidents = active_incidents or []
        if current_hour is None:
            current_hour = datetime.now(timezone.utc).hour

        # Factor 1: Historical Incidents (normalized: max considered is 10 incidents = 100)
        hist_count = zone.get("historical_incidents_count", 0)
        f_hist = min(100.0, (hist_count / 10.0) * 100.0)

        # Factor 2: Active Incident Severity (sum or max of active severities 1-5)
        if active_incidents:
            severity_map = {"LOW": 1, "MEDIUM": 3, "HIGH": 4, "CRITICAL": 5}
            def _parse_sev(val):
                if isinstance(val, (int, float)):
                    return float(val)
                return float(severity_map.get(str(val).upper(), 2))
            max_severity = max(_parse_sev(inc.get("severity", 1)) for inc in active_incidents)
            # Scale 1-5 to 20-100
            f_active = (max_severity / 5.0) * 100.0
        else:
            f_active = 0.0

        # Factor 3: Patrol Neglect (hours since last patrol, threshold: 8 hours = 100)
        neglect_hours = zone.get("last_patrol_hours_ago", 0.0)
        f_neglect = min(100.0, (neglect_hours / 8.0) * 100.0)

        # Factor 4: Base Zone Priority (1 to 10, scale to 10-100)
        base_priority = zone.get("base_priority", 5)
        f_priority = (base_priority / 10.0) * 100.0

        # Factor 5: Time of Day Risk
        # Hostels and parking are high risk at night (21:00 - 05:00)
        # Commercial Uni-Mall and academic blocks are high risk during peak afternoon/evening (12:00 - 18:00)
        category = zone.get("category", "")
        f_tod = cls._compute_time_of_day_risk(category, current_hour)

        # Factor 6: Crowd Density Factor
        f_crowd = cls._compute_crowd_risk(category, current_hour)

        # Factor 7: Active Environmental / Security Alerts
        f_alerts = min(100.0, environmental_alerts_count * 35.0)

        # Weighted Sum
        raw_score = (
            cls.WEIGHTS["historical_incidents"] * f_hist
            + cls.WEIGHTS["active_incident_severity"] * f_active
            + cls.WEIGHTS["patrol_neglect"] * f_neglect
            + cls.WEIGHTS["base_priority"] * f_priority
            + cls.WEIGHTS["time_of_day"] * f_tod
            + cls.WEIGHTS["crowd_density"] * f_crowd
            + cls.WEIGHTS["active_alerts"] * f_alerts
        )

        total_score = round(min(100.0, max(0.0, raw_score)), 1)
        completeness = zone.get("data_completeness", 1.0)

        # Categorization
        if completeness < 0.5:
            risk_level = "Unknown"
            risk_color = "#9CA3AF"  # Gray
            justification = "Data completeness is under 50%; risk classification is unverified."
        elif total_score >= cls.HIGH_THRESHOLD:
            risk_level = "Critical"
            risk_color = "#EF4444"  # Red
            justification = cls._build_justification(zone, total_score, f_active, f_neglect, f_hist)
        elif total_score >= cls.MEDIUM_THRESHOLD:
            risk_level = "High"
            risk_color = "#F97316"  # Orange
            justification = cls._build_justification(zone, total_score, f_active, f_neglect, f_hist)
        elif total_score >= cls.LOW_THRESHOLD:
            risk_level = "Medium"
            risk_color = "#F59E0B"  # Yellow
            justification = cls._build_justification(zone, total_score, f_active, f_neglect, f_hist)
        else:
            risk_level = "Low"
            risk_color = "#10B981"  # Green
            justification = "Normal baseline operations; recently patrolled and no active alerts."

        return {
            "zone_id": zone.get("zone_id"),
            "zone_name": zone.get("name"),
            "total_score": total_score,
            "risk_level": risk_level,
            "risk_color": risk_color,
            "confidence": round(completeness, 2),
            "factors": {
                "historical_incidents": round(f_hist, 1),
                "active_incident_severity": round(f_active, 1),
                "patrol_neglect": round(f_neglect, 1),
                "base_priority": round(f_priority, 1),
                "time_of_day": round(f_tod, 1),
                "crowd_density": round(f_crowd, 1),
                "active_alerts": round(f_alerts, 1),
            },
            "justification": justification,
        }

    @classmethod
    def _compute_time_of_day_risk(cls, category: str, hour: int) -> float:
        """Determines temporal risk modifier based on zone type."""
        is_night = hour >= 21 or hour <= 5
        is_peak = 12 <= hour <= 18

        if category in ["Hostel", "Transit", "Sports"]:
            return 85.0 if is_night else 30.0
        elif category in ["Commercial", "Academic", "Assembly"]:
            return 90.0 if is_peak else 35.0
        elif category in ["Medical", "Entrance"]:
            return 60.0  # Constant vigilance
        return 40.0

    @classmethod
    def _compute_crowd_risk(cls, category: str, hour: int) -> float:
        """Estimates crowd density pressure on security patrol requirements."""
        if category in ["Commercial", "Assembly", "Transit"] and 11 <= hour <= 20:
            return 80.0
        if category in ["Academic"] and 9 <= hour <= 17:
            return 75.0
        return 25.0

    @classmethod
    def _build_justification(
        cls, zone: Dict[str, Any], score: float, f_active: float, f_neglect: float, f_hist: float
    ) -> str:
        name = zone.get("name", "Zone")
        reasons = []
        if f_active >= 60.0:
            reasons.append("active high-severity security incidents")
        if f_neglect >= 50.0:
            hours = zone.get("last_patrol_hours_ago", 0.0)
            reasons.append(f"patrol neglect ({hours:.1f} hours elapsed)")
        if f_hist >= 50.0:
            reasons.append("elevated historical incident frequency")

        if not reasons:
            return f"{name} exhibits moderate security priority based on base zoning classification."
        return f"{name} escalated to {score} due to " + ", and ".join(reasons) + "."
