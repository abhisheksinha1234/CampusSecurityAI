"""
Direct endpoint tests for FastAPI REST API Handlers.
Tests all endpoint functions, inputs, response shapes, and business logic.
"""

import unittest
from fastapi import Response, HTTPException

from backend.main import health_check
from backend.api.routes_campus import (
    get_zones,
    get_zones_geojson,
    get_zone_by_id,
    get_graph,
    create_zone,
    get_edges,
    toggle_edge_status,
    toggle_zone_restriction,
)
from backend.api.routes_risk import (
    get_risk_scores,
    explain_zone_risk,
    get_incidents,
    report_incident,
    update_incident_status,
)
from backend.api.routes_patrol import generate_patrol_plan, approve_patrol_plan, get_current_plan
from backend.api.routes_simulator import simulate_scenario
from backend.api.routes_evaluation import compare_with_baseline, demonstrate_algorithms
from backend.api.routes_auth import login, get_demo_users, LoginRequest
from backend.environment.zone_model import (
    PatrolApprovalRequest,
    ScenarioSimulationRequest,
    IncidentModel,
    IncidentStatusUpdateRequest,
    ZoneModel,
)
from backend.environment.campus_environment import campus_env


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

VIEWER_USER = {
    "user_id": "USR-VIEW-03",
    "username": "viewer",
    "full_name": "Prof. Amanjot Verma",
    "role": "VIEWER",
    "designation": "Campus Safety Observer",
    "badge_number": "LPU-FAC-219",
    "permissions": ["VIEW_MAP", "VIEW_RISK"],
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

    # =======================================================================
    # PHASE 1: INCIDENT MANAGEMENT & OPERATIONAL LIFECYCLE TESTS (10 TESTS)
    # =======================================================================
    def test_update_incident_status_admin(self):
        """ADMIN successfully updates incident status through lifecycle."""
        inc_id = "TEST-ADMIN-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z02",
                zone_name="Admin Block",
                timestamp="2026-11-24T12:00:00Z",
                category="UNAUTHORIZED_ACCESS",
                severity=4,
                description="Test unauthorized access",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        # Transition ACTIVE -> INVESTIGATING
        req1 = IncidentStatusUpdateRequest(status="INVESTIGATING", resolution_notes="Dispatched patrol team.")
        res1 = update_incident_status(inc_id, req1, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(res1["status"], "SUCCESS")
        self.assertEqual(res1["incident"]["status"], "INVESTIGATING")

        # Transition INVESTIGATING -> RESOLVED
        req2 = IncidentStatusUpdateRequest(status="RESOLVED", resolution_notes="Perimeter secured and cleared.")
        res2 = update_incident_status(inc_id, req2, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(res2["status"], "SUCCESS")
        self.assertEqual(res2["incident"]["status"], "RESOLVED")

    def test_update_incident_status_officer(self):
        """PATROL_OFFICER successfully updates incident status."""
        inc_id = "TEST-OFFICER-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z03",
                zone_name="Engineering Labs",
                timestamp="2026-11-24T12:00:00Z",
                category="THEFT_REPORT",
                severity=3,
                description="Officer report test",
            ),
            user=OFFICER_USER,
            _role=OFFICER_USER,
        )

        req = IncidentStatusUpdateRequest(status="INVESTIGATING", resolution_notes="Officer on-site inspection.")
        res = update_incident_status(inc_id, req, user=OFFICER_USER, _role=OFFICER_USER)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["incident"]["status"], "INVESTIGATING")

    def test_update_incident_status_viewer_forbidden(self):
        """VIEWER receives HTTP 403 when attempting to update incident status."""
        inc_id = "TEST-VIEWER-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z04",
                zone_name="Uni-Mall",
                timestamp="2026-11-24T12:00:00Z",
                category="CROWD_CONGESTION",
                severity=3,
                description="Viewer RBAC test",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        req = IncidentStatusUpdateRequest(status="RESOLVED")
        with self.assertRaises(HTTPException) as cm:
            update_incident_status(inc_id, req, user=VIEWER_USER, _role=VIEWER_USER)
        self.assertEqual(cm.exception.status_code, 403)

    def test_update_incident_status_invalid_status_rejected(self):
        """Invalid status string receives HTTP 400."""
        inc_id = "TEST-INV-STATUS-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z05",
                zone_name="Central Library",
                timestamp="2026-11-24T12:00:00Z",
                category="FIRE_SAFETY",
                severity=3,
                description="Invalid status test",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        req = IncidentStatusUpdateRequest(status="CLOSED")  # 'CLOSED' is not in {ACTIVE, INVESTIGATING, RESOLVED}
        with self.assertRaises(HTTPException) as cm:
            update_incident_status(inc_id, req, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("Invalid status", cm.exception.detail)

    def test_update_incident_status_invalid_transition_rejected(self):
        """Invalid lifecycle transitions receive HTTP 400."""
        inc_id = "TEST-TRANSITION-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z06",
                zone_name="Hostel",
                timestamp="2026-11-24T12:00:00Z",
                category="SECURITY_ALERT",
                severity=3,
                description="Transition test",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        # 1. ACTIVE -> ACTIVE (repeated update rejected)
        with self.assertRaises(HTTPException) as cm:
            update_incident_status(inc_id, IncidentStatusUpdateRequest(status="ACTIVE"), user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(cm.exception.status_code, 400)

        # Transition to INVESTIGATING
        update_incident_status(inc_id, IncidentStatusUpdateRequest(status="INVESTIGATING"), user=ADMIN_USER, _role=ADMIN_USER)

        # 2. INVESTIGATING -> ACTIVE (backwards transition rejected)
        with self.assertRaises(HTTPException) as cm:
            update_incident_status(inc_id, IncidentStatusUpdateRequest(status="ACTIVE"), user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(cm.exception.status_code, 400)

        # Transition to RESOLVED
        update_incident_status(inc_id, IncidentStatusUpdateRequest(status="RESOLVED"), user=ADMIN_USER, _role=ADMIN_USER)

        # 3. RESOLVED -> any status (terminal state modification rejected)
        with self.assertRaises(HTTPException) as cm:
            update_incident_status(inc_id, IncidentStatusUpdateRequest(status="ACTIVE"), user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("already RESOLVED", cm.exception.detail)

    def test_update_incident_status_nonexistent_rejected(self):
        """Non-existent incident ID receives HTTP 404."""
        req = IncidentStatusUpdateRequest(status="RESOLVED")
        with self.assertRaises(HTTPException) as cm:
            update_incident_status("NONEXISTENT_INCIDENT_9999", req, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(cm.exception.status_code, 404)

    def test_resolved_incident_excludes_active_risk(self):
        """Resolved incident no longer contributes active incident risk to affected sector."""
        zone_id = "Z07"
        inc_id = "TEST-RISK-DEESCALATE-01"

        # Baseline risk before incident
        zone = campus_env.get_zone(zone_id)
        base_active = campus_env.get_active_incidents(zone_id)
        initial_score = zone.get("risk_score", 30.0)

        # Inject Severity 5 incident
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id=zone_id,
                zone_name=zone.get("name", zone_id),
                timestamp="2026-11-24T12:00:00Z",
                category="FIRE_SAFETY",
                severity=5,
                description="Severe fire alarm",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        # Zone risk with active Sev 5 incident
        elevated_active = campus_env.get_active_incidents(zone_id)
        self.assertTrue(any(i["incident_id"] == inc_id for i in elevated_active))

        # Now resolve the incident
        res = update_incident_status(
            inc_id,
            IncidentStatusUpdateRequest(status="RESOLVED", resolution_notes="False alarm, system reset."),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )
        self.assertEqual(res["status"], "SUCCESS")

        # Confirm incident is excluded from active incidents
        final_active = campus_env.get_active_incidents(zone_id)
        self.assertFalse(any(i["incident_id"] == inc_id for i in final_active))

        # Zone risk score dropped back
        resolved_score = res["affected_zone"]["risk_score"]
        self.assertLess(resolved_score, 75.0)

    def test_multi_incident_sector_risk_retention(self):
        """Resolving one incident preserves risk contributions from remaining active incidents."""
        zone_id = "Z08"
        inc1_id = "TEST-MULTI-01"
        inc2_id = "TEST-MULTI-02"

        # Add two incidents: Sev 5 and Sev 3
        report_incident(
            IncidentModel(
                incident_id=inc1_id,
                zone_id=zone_id,
                zone_name="Boys Hostel",
                timestamp="2026-11-24T12:00:00Z",
                category="SECURITY_ALERT",
                severity=5,
                description="Severe intrusion attempt",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )
        report_incident(
            IncidentModel(
                incident_id=inc2_id,
                zone_id=zone_id,
                zone_name="Boys Hostel",
                timestamp="2026-11-24T12:05:00Z",
                category="CROWD_CONGESTION",
                severity=3,
                description="Crowd gathering at lobby",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        # Both are active: active incidents count >= 2
        active_before = campus_env.get_active_incidents(zone_id)
        self.assertGreaterEqual(len(active_before), 2)

        # Resolve ONLY inc1 (Sev 5)
        res1 = update_incident_status(
            inc1_id,
            IncidentStatusUpdateRequest(status="RESOLVED", resolution_notes="Intruder apprehended."),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )
        self.assertEqual(res1["status"], "SUCCESS")

        # inc2 (Sev 3) MUST still be active!
        active_mid = campus_env.get_active_incidents(zone_id)
        self.assertTrue(any(i["incident_id"] == inc2_id for i in active_mid))
        self.assertFalse(any(i["incident_id"] == inc1_id for i in active_mid))

        # Risk score reflects remaining Sev 3 incident (active count >= 1)
        self.assertGreaterEqual(res1["affected_zone"]["active_incidents_count"], 1)

        # Now resolve inc2 (Sev 3)
        res2 = update_incident_status(
            inc2_id,
            IncidentStatusUpdateRequest(status="RESOLVED", resolution_notes="Crowd dispersed peacefully."),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )
        self.assertEqual(res2["status"], "SUCCESS")

        # Both are now resolved: no active incidents remain in zone
        active_final = campus_env.get_active_incidents(zone_id)
        self.assertFalse(any(i["incident_id"] in [inc1_id, inc2_id] for i in active_final))

    def test_resolution_metadata_recorded(self):
        """Status updates record timestamp, operator identity, resolution notes, and history."""
        inc_id = "TEST-METADATA-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z09",
                zone_name="Sports Complex",
                timestamp="2026-11-24T10:00:00Z",
                category="MEDICAL_EMERGENCY",
                severity=3,
                description="Sprained ankle during match",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        res = update_incident_status(
            inc_id,
            IncidentStatusUpdateRequest(
                status="RESOLVED",
                resolution_notes="First aid provided, student escorted to clinic."
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        inc = res["incident"]
        self.assertEqual(inc["incident_id"], inc_id)
        self.assertEqual(inc["timestamp"], "2026-11-24T10:00:00Z")  # Original creation time preserved
        self.assertEqual(inc["status"], "RESOLVED")
        self.assertEqual(inc["resolved_by"], "CSO Vikramaditya Singh")
        self.assertIsNotNone(inc.get("resolved_at"))
        self.assertEqual(inc["resolution_notes"], "First aid provided, student escorted to clinic.")
        self.assertIn("status_history", inc)
        self.assertGreaterEqual(len(inc["status_history"]), 1)
        self.assertEqual(inc["status_history"][-1]["to_status"], "RESOLVED")

    def test_existing_incident_endpoints_compatibility(self):
        """GET /api/risk/incidents remains backwards compatible and supports status filtering."""
        inc_id = "TEST-COMPAT-01"
        report_incident(
            IncidentModel(
                incident_id=inc_id,
                zone_id="Z10",
                zone_name="Research Block",
                timestamp="2026-11-24T12:00:00Z",
                category="UNAUTHORIZED_ACCESS",
                severity=2,
                description="Compatibility test incident",
            ),
            user=ADMIN_USER,
            _role=ADMIN_USER,
        )

        # GET all incidents
        all_incs = get_incidents(user=ADMIN_USER)
        self.assertIn("incidents", all_incs)
        self.assertIn("count", all_incs)
        self.assertTrue(any(i["incident_id"] == inc_id for i in all_incs["incidents"]))

        # GET filtered by ACTIVE
        active_incs = get_incidents(status="ACTIVE", user=ADMIN_USER)
        self.assertTrue(any(i["incident_id"] == inc_id for i in active_incs["incidents"]))

        # Resolve incident
        update_incident_status(inc_id, IncidentStatusUpdateRequest(status="RESOLVED"), user=ADMIN_USER, _role=ADMIN_USER)

        # GET filtered by RESOLVED
        resolved_incs = get_incidents(status="RESOLVED", user=ADMIN_USER)
        self.assertTrue(any(i["incident_id"] == inc_id for i in resolved_incs["incidents"]))

    def test_admin_create_zone_success(self):
        """Admin can successfully register a new zone within LPU coordinates."""
        new_zone = ZoneModel(
            zone_id="Z99",
            name="South Innovation Lab",
            category="Academic",
            latitude=31.2530,
            longitude=75.7037,
            base_priority=6,
            description="Robotics and AI research pavilion",
        )
        try:
            res = create_zone(new_zone, user=ADMIN_USER, _role=ADMIN_USER)
            self.assertEqual(res["status"], "SUCCESS")
            self.assertEqual(res["zone"]["zone_id"], "Z99")
            self.assertIn("Z99", campus_env.zones)
        finally:
            campus_env.zones.pop("Z99", None)

    def test_duplicate_zone_id_rejected(self):
        """Attempting to register a zone with an existing ID returns HTTP 400."""
        dup_zone = ZoneModel(
            zone_id="Z01",
            name="Duplicate Main Gate",
            category="Entrance",
            latitude=31.2530,
            longitude=75.7037,
            base_priority=5,
        )
        with self.assertRaises(HTTPException) as ctx:
            create_zone(dup_zone, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already exists", ctx.exception.detail)

    def test_invalid_coordinates_rejected(self):
        """Zone coordinates outside LPU campus boundaries raise HTTP 400."""
        out_of_bounds_zone = ZoneModel(
            zone_id="Z98",
            name="Far Off-Campus Site",
            category="Other",
            latitude=28.6139,
            longitude=77.2090,
            base_priority=5,
        )
        with self.assertRaises(HTTPException) as ctx:
            create_zone(out_of_bounds_zone, user=ADMIN_USER, _role=ADMIN_USER)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_non_admin_cannot_create_zone(self):
        """Non-admin user (PATROL_OFFICER or VIEWER) receives HTTP 403 on create_zone."""
        new_zone = ZoneModel(
            zone_id="Z97",
            name="Unauthorized Sector",
            category="Academic",
            latitude=31.2530,
            longitude=75.7037,
            base_priority=5,
        )
        with self.assertRaises(HTTPException) as ctx:
            create_zone(new_zone, user=OFFICER_USER, _role=OFFICER_USER)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_get_edges_returns_walkways(self):
        """GET /api/campus/edges returns all pedestrian paths with operational status."""
        res = get_edges(user=ADMIN_USER)
        self.assertIn("edges", res)
        self.assertGreaterEqual(res["total"], 18)
        self.assertTrue(all("edge_id" in e and "is_open" in e for e in res["edges"]))

    def test_admin_toggle_walkway_status(self):
        """Admin can close and reopen pedestrian walkways with immediate status reflection."""
        edge_id = "E01"
        try:
            res_close = toggle_edge_status(
                edge_id=edge_id,
                is_open=False,
                restriction_reason="Maintenance and security drill",
                user=ADMIN_USER,
                _role=ADMIN_USER,
            )
            self.assertEqual(res_close["status"], "SUCCESS")
            self.assertFalse(res_close["is_open"])
            self.assertFalse(campus_env.edges[edge_id]["is_open"])

            res_open = toggle_edge_status(
                edge_id=edge_id,
                is_open=True,
                restriction_reason=None,
                user=ADMIN_USER,
                _role=ADMIN_USER,
            )
            self.assertEqual(res_open["status"], "SUCCESS")
            self.assertTrue(res_open["is_open"])
            self.assertTrue(campus_env.edges[edge_id]["is_open"])
        finally:
            campus_env.set_edge_status(edge_id, True, None)

    def test_non_admin_cannot_toggle_walkway_status(self):
        """Non-admin user receives HTTP 403 when attempting to toggle walkway status."""
        with self.assertRaises(HTTPException) as ctx:
            toggle_edge_status(
                edge_id="E01",
                is_open=False,
                restriction_reason=None,
                user=OFFICER_USER,
                _role=OFFICER_USER,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_toggle_nonexistent_edge_rejected(self):
        """Toggling a nonexistent edge ID raises HTTP 404."""
        with self.assertRaises(HTTPException) as ctx:
            toggle_edge_status(
                edge_id="E999",
                is_open=False,
                restriction_reason=None,
                user=ADMIN_USER,
                _role=ADMIN_USER,
            )
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
