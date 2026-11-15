"""
Direct endpoint tests for FastAPI REST API Handlers.
Tests all endpoint functions, inputs, response shapes, and business logic.
"""

import unittest
from fastapi import Response

from backend.main import health_check
from backend.api.routes_campus import get_zones, get_zones_geojson, get_zone_by_id, get_graph
from backend.api.routes_risk import get_risk_scores, explain_zone_risk, get_incidents
from backend.api.routes_patrol import generate_patrol_plan, approve_patrol_plan, get_current_plan
from backend.api.routes_simulator import simulate_scenario
from backend.api.routes_evaluation import compare_with_baseline, demonstrate_algorithms
from backend.api.routes_auth import login, get_demo_users, LoginRequest
from backend.environment.zone_model import PatrolApprovalRequest, ScenarioSimulationRequest


ADMIN_USER = {
    "user_id": "USR-ADMIN-01",
    "username": "admin",
    "full_name": "CSO Vikramaditya Singh",
    "role": "ADMIN",
    "designation": "Chief Security Officer (HQ)",
    "badge_number": "LPU-SEC-001",
    "permissions": ["PLAN_PATROL", "APPROVE_PATROL", "MANAGE_ZONES"],
}

OFFICER_USER = {
    "user_id": "USR-GUARD-08",
    "username": "officer",
    "full_name": "Guard Harpreet Kaur",
    "role": "PATROL_OFFICER",
    "designation": "Field Patrol Supervisor (Sector 2)",
    "badge_number": "LPU-SEC-084",
    "permissions": ["VIEW_PATROL", "REPORT_INCIDENT", "VIEW_MAP", "VIEW_RISK"],
}


class TestAPIEndpoints(unittest.TestCase):
    def test_auth_login(self):
        # Admin login
        admin_req = LoginRequest(username="admin", password="lpu@security2026")
        mock_resp = Response()
        admin_res = login(admin_req, mock_resp)
        self.assertEqual(admin_res.status, "SUCCESS")
        self.assertEqual(admin_res.user.role, "ADMIN")
        self.assertIn("PLAN_PATROL", admin_res.user.permissions)

        # Officer login
        officer_req = LoginRequest(username="officer", password="patrol@lpu")
        officer_res = login(officer_req, mock_resp)
        self.assertEqual(officer_res.status, "SUCCESS")
        self.assertEqual(officer_res.user.role, "PATROL_OFFICER")

        # Demo users endpoint (passwords are NOT returned)
        demo_users = get_demo_users()
        self.assertGreaterEqual(len(demo_users), 2)
        for u in demo_users:
            self.assertNotIn("password", u)
            self.assertNotIn("password_hash", u)

    def test_health_endpoint(self):
        res = health_check()
        self.assertEqual(res["status"], "HEALTHY")
        self.assertEqual(res["campus"], "Lovely Professional University (LPU), Punjab, India")
        self.assertGreaterEqual(res["statistics"]["total_zones"], 10)

    def test_campus_zones_and_geojson(self):
        data = get_zones(include_risk=True, user=ADMIN_USER)
        self.assertGreaterEqual(data["total"], 10)
        self.assertIn("zones", data)

        geojson = get_zones_geojson(user=ADMIN_USER)
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertGreaterEqual(len(geojson["features"]), 10)

        # Single zone retrieval
        zone_z01 = get_zone_by_id("Z01", user=ADMIN_USER)
        self.assertEqual(zone_z01["zone_id"], "Z01")
        self.assertIn("risk_score", zone_z01)

    def test_campus_graph(self):
        graph_data = get_graph(user=ADMIN_USER)
        self.assertTrue(graph_data["summary"]["is_fully_connected"])
        self.assertGreater(graph_data["summary"]["total_nodes"], 10)
        self.assertGreater(graph_data["summary"]["total_edges"], 10)

    def test_risk_scores_and_explanations(self):
        scores_res = get_risk_scores(user=ADMIN_USER)
        self.assertGreater(scores_res["total_zones"], 0)

        explanation = explain_zone_risk("Z04", user=ADMIN_USER)
        self.assertEqual(explanation["zone_id"], "Z04")
        self.assertIn("confidence_rating", explanation["explanation"])

    def test_patrol_plan_and_approval(self):
        plan = generate_patrol_plan(
            start_zone_id="Z12",
            end_zone_id="Z12",
            time_budget_minutes=45.0,
            user=ADMIN_USER,
        )
        self.assertTrue(plan["is_feasible"])
        self.assertEqual(plan["status"], "PENDING_REVIEW")
        plan_id = plan["plan_id"]

        req = PatrolApprovalRequest(
            plan_id=plan_id,
            reviewer_name="CSO Vikramaditya Singh",
            action="APPROVE",
            comments="Approved for routine patrol shift."
        )
        app_res = approve_patrol_plan(req, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(app_res["status"], "SUCCESS")
        self.assertEqual(app_res["new_status"], "APPROVE")

    def test_scenario_simulator(self):
        sim_req = ScenarioSimulationRequest(
            scenario_type="NEW_INCIDENT",
            target_zone_id="Z04",
            incident_severity=5,
            incident_description="Simulated flash crowd at Uni-Mall food court"
        )
        sim_res = simulate_scenario(sim_req, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(sim_res["status"], "SUCCESS")
        self.assertIsNotNone(sim_res["replanned_plan"])
        self.assertIn("Z04", [s["zone_id"] for s in sim_res["replanned_plan"]["stops"]])

    def test_evaluation_baseline_comparison(self):
        comp = compare_with_baseline("Test Assessment", user=ADMIN_USER)
        self.assertIn("fixed_baseline", comp)
        self.assertIn("adaptive_agent", comp)
        self.assertIn("summary_analysis", comp)

    def test_algorithms_demonstration(self):
        res = demonstrate_algorithms("Z01", "Z08", user=ADMIN_USER)
        self.assertIn("bfs", res["results"])
        self.assertIn("dfs", res["results"])
        self.assertIn("dijkstra", res["results"])
        self.assertIn("astar", res["results"])


if __name__ == "__main__":
    unittest.main()
