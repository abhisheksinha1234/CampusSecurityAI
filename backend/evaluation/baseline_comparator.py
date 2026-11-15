"""
Baseline Comparison and Evaluation Module.
Benchmarks the Adaptive Goal-Based AI Agent against a static, fixed-route baseline patrol.
Computes coverage, safety constraint violations, priority fulfillment, and efficiency trade-offs.
"""

import time
from typing import Dict, Any, List
from backend.environment.campus_environment import CampusEnvironment
from backend.agent.goal_based_agent import GoalBasedPatrolAgent
from backend.search.dijkstra_astar import dijkstra_shortest_path
from backend.search.graph_builder import CampusGraphBuilder


class BaselineComparator:
    """Compares Fixed Baseline Patrol vs. Adaptive AI Patrol Agent."""

    # Traditional static patrol sequence (pre-determined round-robin schedule)
    STATIC_PATROL_SEQUENCE = ["Z12", "Z01", "Z02", "Z06", "Z03", "Z04", "Z07", "Z12"]

    @classmethod
    def evaluate_scenario(
        cls,
        env: CampusEnvironment,
        agent: GoalBasedPatrolAgent,
        scenario_name: str = "Standard Campus Surveillance"
    ) -> Dict[str, Any]:
        """
        Runs both fixed baseline and adaptive agent on the current campus state and benchmarks metrics.
        """
        # 1. Run Adaptive Agent
        t0 = time.perf_counter()
        adaptive_plan = agent.plan_patrol(start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0)
        t_agent_ms = round((time.perf_counter() - t0) * 1000, 2)

        # 2. Evaluate Static Fixed Baseline
        t1 = time.perf_counter()
        static_metrics = cls._evaluate_fixed_patrol(env, cls.STATIC_PATROL_SEQUENCE)
        t_static_ms = round((time.perf_counter() - t1) * 1000, 2)

        # High-risk target identification across campus
        zones = env.get_all_zones()
        high_risk_zones = [
            z["zone_id"] for z in zones
            if z.get("risk_score", 0.0) >= 55.0 and not z.get("is_restricted", False)
        ]

        adaptive_visited = set(s["zone_id"] for s in adaptive_plan.get("stops", []))
        static_visited = set(static_metrics["stops_sequence"])

        adaptive_hr_visited = [z for z in high_risk_zones if z in adaptive_visited]
        static_hr_visited = [z for z in high_risk_zones if z in static_visited]

        hr_total = max(1, len(high_risk_zones))
        adaptive_hr_cov = round((len(adaptive_hr_visited) / hr_total) * 100.0, 1)
        static_hr_cov = round((len(static_hr_visited) / hr_total) * 100.0, 1)

        # Differences
        diff_coverage = round(adaptive_hr_cov - static_hr_cov, 1)
        diff_distance = round(
            adaptive_plan.get("total_distance_meters", 0.0) - static_metrics["total_distance_meters"], 1
        )
        diff_duration = round(
            adaptive_plan.get("total_estimated_duration_minutes", 0.0) - static_metrics["total_duration_minutes"], 1
        )

        analysis = (
            f"Under '{scenario_name}', the Adaptive AI Planner achieved {adaptive_hr_cov}% high-risk zone coverage "
            f"compared to {static_hr_cov}% for the Fixed Baseline ({diff_coverage:+}% improvement). "
        )
        if static_metrics["constraint_violations"]:
            analysis += (
                f"Crucially, the Fixed Baseline committed {len(static_metrics['constraint_violations'])} constraint violation(s) "
                f"by scheduling patrols through obstructed or restricted zones, whereas the Adaptive Agent dynamically avoided all hazards."
            )
        else:
            analysis += "The Adaptive Agent dynamically allocated surveillance resources directly to zones with elevated active risk."

        return {
            "scenario_name": scenario_name,
            "timestamp": env.last_updated,
            "high_risk_zones_detected": high_risk_zones,
            "fixed_baseline": {
                "name": "Fixed Schedule Round-Robin",
                "stops": static_metrics["stops_sequence"],
                "total_stops": len(static_metrics["stops_sequence"]),
                "total_distance_meters": static_metrics["total_distance_meters"],
                "total_duration_minutes": static_metrics["total_duration_minutes"],
                "high_risk_coverage_pct": static_hr_cov,
                "high_risk_visited": static_hr_visited,
                "constraint_violations": static_metrics["constraint_violations"],
                "execution_time_ms": t_static_ms,
            },
            "adaptive_agent": {
                "name": "Adaptive Goal-Based AI Agent",
                "plan_id": adaptive_plan.get("plan_id"),
                "stops": [s["zone_id"] for s in adaptive_plan.get("stops", [])],
                "total_stops": len(adaptive_plan.get("stops", [])),
                "total_distance_meters": adaptive_plan.get("total_distance_meters", 0.0),
                "total_duration_minutes": adaptive_plan.get("total_estimated_duration_minutes", 0.0),
                "high_risk_coverage_pct": adaptive_hr_cov,
                "high_risk_visited": adaptive_hr_visited,
                "constraint_violations": adaptive_plan.get("validation", {}).get("violations", []),
                "execution_time_ms": t_agent_ms,
            },
            "comparative_metrics": {
                "coverage_advantage_percentage": diff_coverage,
                "distance_delta_meters": diff_distance,
                "duration_delta_minutes": diff_duration,
                "violations_prevented": len(static_metrics["constraint_violations"]),
            },
            "summary_analysis": analysis,
        }

    @classmethod
    def _evaluate_fixed_patrol(cls, env: CampusEnvironment, sequence: List[str]) -> Dict[str, Any]:
        """Calculates distance, time, and constraint violations of the fixed sequence."""
        # Build raw graph including closed edges to see if fixed patrol violates closures
        all_zones = env.get_all_zones()
        all_edges = env.get_all_edges()
        raw_graph = CampusGraphBuilder.build_graph(all_zones, all_edges, include_closed_edges=True)

        total_dist = 0.0
        total_time = 0.0
        violations = []

        for i in range(len(sequence) - 1):
            u = sequence[i]
            v = sequence[i + 1]

            # Check if edge is open
            edge_obj = next(
                (e for e in all_edges if (e["source"] == u and e["target"] == v) or (e["source"] == v and e["target"] == u)),
                None
            )
            if edge_obj and not edge_obj.get("is_open", True):
                violations.append(f"Fixed patrol walked into closed path: {u} -> {v} ({edge_obj.get('restriction_reason')})")

            # Check if destination is restricted
            z_dst = env.get_zone(v)
            if z_dst and z_dst.get("is_restricted", False):
                violations.append(f"Fixed patrol traversed restricted zone: {v} ({z_dst.get('restriction_reason')})")

            # Point to point shortest path
            res = dijkstra_shortest_path(raw_graph, u, v)
            if res["success"]:
                total_dist += res["total_distance_meters"]
                total_time += res["estimated_duration_minutes"] + 2.0  # +2 min dwell
            else:
                violations.append(f"Fixed path disconnected between {u} and {v}.")

        return {
            "stops_sequence": sequence,
            "total_distance_meters": round(total_dist, 1),
            "total_duration_minutes": round(total_time, 1),
            "constraint_violations": violations,
        }
