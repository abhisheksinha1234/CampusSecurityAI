"""
Unit tests for Goal-Based Patrol Agent and Dynamic Replanning.
"""

import unittest
from backend.environment.campus_environment import CampusEnvironment
from backend.agent.goal_based_agent import GoalBasedPatrolAgent
from backend.environment.zone_model import PatrolApprovalRequest


class TestPatrolAgent(unittest.TestCase):
    def setUp(self):
        self.env = CampusEnvironment()
        self.agent = GoalBasedPatrolAgent(self.env)

    def test_agent_planning_lifecycle(self):
        plan = self.agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)
        self.assertIsNotNone(plan["plan_id"])
        self.assertEqual(plan["status"], "PENDING_REVIEW")
        self.assertTrue(plan["is_feasible"])
        self.assertGreater(len(plan["stops"]), 2)
        self.assertGreater(len(plan["explanations"]), 0)

    def test_dynamic_replanning_on_incident(self):
        # Baseline plan
        initial_plan = self.agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)
        # Inject high-severity incident at Z08
        self.env.add_incident({
            "incident_id": "TEST-INC-1",
            "zone_id": "Z08",
            "zone_name": "Boys Hostel Cluster",
            "timestamp": "2026-11-13T12:00:00",
            "category": "INTRUSION_ALERT",
            "severity": 5,
            "status": "ACTIVE",
            "description": "Perimeter breach detected at Block 4.",
            "is_simulated": True,
        })
        replanned = self.agent.replan_patrol("Incident at Z08")
        self.assertTrue(replanned["is_feasible"])
        visited_zones = [s["zone_id"] for s in replanned["stops"]]
        self.assertIn("Z08", visited_zones)
        self.assertIsNotNone(replanned.get("replan_comparison"))

    def test_path_closure_avoidance(self):
        # Close edge E01 between Z01 and Z12
        self.env.set_edge_status("E01", is_open=False, restriction_reason="Construction")
        plan = self.agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)
        self.assertTrue(plan["is_feasible"])
        # Ensure that no segment uses E01
        for i in range(len(plan["stops"]) - 1):
            pair = (plan["stops"][i]["zone_id"], plan["stops"][i + 1]["zone_id"])
            self.assertNotIn(pair, [("Z01", "Z12"), ("Z12", "Z01")])


if __name__ == "__main__":
    unittest.main()
