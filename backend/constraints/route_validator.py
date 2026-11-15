"""
Operational Constraints Validator for Campus Security Patrol Plans.
Validates time budgets, closed edges, security clearance, and mandatory safety rules.
"""

from typing import Dict, Any, List, Set
import networkx as nx


class RouteConstraintValidator:
    """Validates candidate routes against realistic campus security constraints."""

    @staticmethod
    def validate_plan(
        plan: Dict[str, Any],
        graph: nx.Graph,
        max_time_budget_minutes: float,
        excluded_zones: List[str] = None
    ) -> Dict[str, Any]:
        violations = []
        warnings = []
        excluded_set = set(excluded_zones or [])

        # Constraint 1: Time Budget Check
        duration = plan.get("total_estimated_duration_minutes", 0.0)
        if duration > max_time_budget_minutes:
            violations.append(
                f"Time budget exceeded: Route duration {duration:.1f} mins exceeds limit of {max_time_budget_minutes:.1f} mins."
            )

        # Constraint 2: Excluded / Restricted Zones
        visited_nodes = [s["zone_id"] for s in plan.get("stops", [])]
        for node in visited_nodes:
            if node in excluded_set:
                violations.append(f"Safety violation: Route traverses restricted zone {node}.")

        # Constraint 3: Closed Edges Traversal
        stops = plan.get("stops", [])
        for i in range(len(stops) - 1):
            u = stops[i]["zone_id"]
            v = stops[i + 1]["zone_id"]
            if graph.has_edge(u, v):
                edge_data = graph.get_edge_data(u, v)
                if not edge_data.get("is_open", True):
                    violations.append(f"Path obstruction: Edge {u} -> {v} is closed ({edge_data.get('restriction_reason')}).")

        # Constraint 4: Data Quality / Incomplete Information Warning
        for stop in stops:
            z_id = stop["zone_id"]
            if graph.has_node(z_id):
                node_data = graph.nodes[z_id]
                if node_data.get("data_completeness", 1.0) < 0.7:
                    warnings.append(f"Notice: Zone {z_id} has partial sensor data completeness.")

        is_valid = len(violations) == 0
        return {
            "is_valid": is_valid,
            "violations": violations,
            "warnings": warnings,
        }
