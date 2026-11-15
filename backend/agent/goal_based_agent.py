"""
Goal-Based Intelligent Patrol Agent for Lovely Professional University.
Implements the full agent loop:
Observe Environment -> Assess Risk -> Evaluate Rules -> Formulate Goals ->
Optimize Constrained Route -> Validate Constraints -> Explain Decisions.
Supports dynamic replanning on campus triggers.
"""

from datetime import datetime, timezone
import uuid
from typing import Dict, Any, List, Optional
from backend.environment.campus_environment import CampusEnvironment
from backend.risk_engine.risk_classifier import RiskClassifier
from backend.agent.rules import SecurityRuleEngine
from backend.search.graph_builder import CampusGraphBuilder
from backend.search.patrol_optimizer import PatrolOptimizer
from backend.constraints.route_validator import RouteConstraintValidator
from backend.explanations.explainability_engine import ExplainabilityEngine


class GoalBasedPatrolAgent:
    """The central security AI planning agent."""

    def __init__(self, env: CampusEnvironment):
        self.env = env
        self.rule_engine = SecurityRuleEngine()
        self.current_plan: Optional[Dict[str, Any]] = None
        self.plan_history: List[Dict[str, Any]] = []

    def plan_patrol(
        self,
        start_zone_id: str = "Z12",
        end_zone_id: str = "Z12",
        time_budget_minutes: float = 45.0,
        dwell_time_minutes: float = 2.0,
        current_hour: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes a complete planning iteration based on live campus state.
        """
        # Step 1: Perceive Environment & Assess Risk
        zones = self.env.get_all_zones()
        evaluated_zones = []
        for zone in zones:
            z_id = zone["zone_id"]
            active_incs = self.env.get_active_incidents(z_id)
            risk_res = RiskClassifier.evaluate_zone_risk(zone, active_incs, current_hour=current_hour)
            # Update zone with calculated risk
            zone["risk_score"] = risk_res["total_score"]
            zone["risk_level"] = risk_res["risk_level"]
            zone["risk_color"] = risk_res["risk_color"]
            zone["risk_breakdown"] = risk_res
            evaluated_zones.append(zone)

        # Step 2: Evaluate Security Rules
        rule_context = {
            "current_hour": current_hour if current_hour is not None else datetime.now(timezone.utc).hour,
            "active_incidents": self.env.get_active_incidents(),
            "zones": evaluated_zones,
        }
        rule_eval = self.rule_engine.evaluate_all(rule_context)

        # Step 3: Construct Constrained Graph
        edges = self.env.get_all_edges()
        graph = CampusGraphBuilder.build_graph(
            evaluated_zones,
            edges,
            include_closed_edges=False,
            include_restricted_zones=True
        )

        # Step 4: Multi-Goal Constrained Optimization
        plan_res = PatrolOptimizer.optimize_patrol(
            graph=graph,
            start_zone_id=start_zone_id,
            end_zone_id=end_zone_id,
            time_budget_minutes=time_budget_minutes,
            dwell_time_per_stop_minutes=dwell_time_minutes,
            mandatory_zone_ids=rule_eval["mandatory_zones"],
            excluded_zone_ids=rule_eval["excluded_zones"],
        )

        plan_id = f"PLAN-{uuid.uuid4().hex[:8].upper()}"
        plan_res["plan_id"] = plan_id
        plan_res["created_at"] = datetime.now(timezone.utc).isoformat()
        plan_res["status"] = "PENDING_REVIEW"
        plan_res["start_zone_id"] = start_zone_id
        plan_res["end_zone_id"] = end_zone_id

        # Step 5: Constraint Validation
        validation = RouteConstraintValidator.validate_plan(
            plan_res, graph, time_budget_minutes, rule_eval["excluded_zones"]
        )
        plan_res["validation"] = validation
        plan_res["is_feasible"] = plan_res.get("is_feasible", True) and validation["is_valid"]

        # Step 6: Generate Explainable AI Justifications
        xai_explanations = ExplainabilityEngine.generate_plan_explanation(
            plan_res, rule_eval["triggered_rules"]
        )
        plan_res["explanations"] = xai_explanations
        plan_res["triggered_rules"] = rule_eval["triggered_rules"]

        # Cache active plan
        self.current_plan = plan_res
        self.plan_history.append(plan_res)

        return plan_res

    def replan_patrol(
        self,
        trigger_description: str,
        start_zone_id: Optional[str] = None,
        end_zone_id: Optional[str] = None,
        time_budget_minutes: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Dynamically replans in response to a simulated event, comparing before and after.
        """
        old_plan = self.current_plan
        start_z = start_zone_id or (old_plan["start_zone_id"] if old_plan else "Z12")
        end_z = end_zone_id or (old_plan["end_zone_id"] if old_plan else "Z12")
        budget = time_budget_minutes or (old_plan["time_budget_minutes"] if old_plan else 45.0)

        new_plan = self.plan_patrol(
            start_zone_id=start_z,
            end_zone_id=end_z,
            time_budget_minutes=budget
        )

        comparison = None
        if old_plan and old_plan.get("is_feasible"):
            comparison = ExplainabilityEngine.explain_replanning_change(
                old_plan, new_plan, trigger_description
            )

        new_plan["replan_comparison"] = comparison
        return new_plan
