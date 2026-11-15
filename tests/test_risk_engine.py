"""
Unit tests for Risk Engine and Classification.
"""

import unittest
from backend.risk_engine.risk_classifier import RiskClassifier


class TestRiskClassifier(unittest.TestCase):
    def test_low_risk_zone(self):
        zone = {
            "zone_id": "Z_TEST",
            "name": "Quiet Garden",
            "category": "Academic",
            "base_priority": 2,
            "last_patrol_hours_ago": 0.5,
            "historical_incidents_count": 0,
            "data_completeness": 1.0,
        }
        res = RiskClassifier.evaluate_zone_risk(zone, active_incidents=[], current_hour=10)
        self.assertLess(res["total_score"], 35.0)
        self.assertIn(res["risk_level"], ["Low", "Medium"])
        self.assertEqual(res["confidence"], 1.0)

    def test_critical_risk_escalation_on_incident(self):
        zone = {
            "zone_id": "Z_TEST",
            "name": "High Alert Mall",
            "category": "Commercial",
            "base_priority": 9,
            "last_patrol_hours_ago": 6.0,
            "historical_incidents_count": 8,
            "data_completeness": 0.95,
        }
        active_incidents = [
            {"severity": 5, "status": "ACTIVE", "category": "EMERGENCY"}
        ]
        res = RiskClassifier.evaluate_zone_risk(zone, active_incidents=active_incidents, current_hour=14)
        self.assertGreaterEqual(res["total_score"], 70.0)
        self.assertIn(res["risk_level"], ["High", "Critical"])
        self.assertIn("active high-severity security incidents", res["justification"])

    def test_incomplete_data_returns_unknown(self):
        zone = {
            "zone_id": "Z_UNVERIFIED",
            "name": "Unverified Zone",
            "category": "Unknown",
            "base_priority": 5,
            "last_patrol_hours_ago": 2.0,
            "historical_incidents_count": 1,
            "data_completeness": 0.3,  # < 0.5
        }
        res = RiskClassifier.evaluate_zone_risk(zone, active_incidents=[])
        self.assertEqual(res["risk_level"], "Unknown")
        self.assertEqual(res["risk_color"], "#9CA3AF")
        self.assertIn("unverified", res["justification"])


if __name__ == "__main__":
    unittest.main()
