"""
NetworkX Graph Builder for Lovely Professional University.
Converts verified zones and walkable edges into a weighted, attributed NetworkX graph.
Handles active closures, restrictions, and accessibility constraints.
"""

from typing import Dict, Any, List, Optional
import networkx as nx


class CampusGraphBuilder:
    """Builds and updates NetworkX graphs from campus environment state."""

    @staticmethod
    def build_graph(
        zones: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        include_closed_edges: bool = False,
        include_restricted_zones: bool = True
    ) -> nx.Graph:
        """
        Builds a NetworkX undirected graph representing verified walkable campus paths.
        Nodes store zone metadata (coordinates, risk, priority).
        Edges store physical distance (meters) and estimated walking time (minutes).
        """
        graph = nx.Graph()

        # Add Nodes
        for zone in zones:
            zone_id = zone["zone_id"]
            if not include_restricted_zones and zone.get("is_restricted", False):
                continue
            graph.add_node(
                zone_id,
                name=zone.get("name"),
                category=zone.get("category"),
                latitude=zone.get("latitude"),
                longitude=zone.get("longitude"),
                base_priority=zone.get("base_priority", 5),
                risk_score=zone.get("risk_score", 0.0),
                risk_level=zone.get("risk_level", "Low"),
                risk_color=zone.get("risk_color", "#10B981"),
                is_restricted=zone.get("is_restricted", False),
                is_accessible=zone.get("is_accessible", True),
                last_patrol_hours_ago=zone.get("last_patrol_hours_ago", 0.0),
            )

        # Add Edges
        for edge in edges:
            src = edge["source"]
            dst = edge["target"]

            # Verify that both endpoints exist in current nodes
            if not graph.has_node(src) or not graph.has_node(dst):
                continue

            # Check if edge is closed
            if not include_closed_edges and not edge.get("is_open", True):
                continue

            dist_m = edge.get("distance_meters", 100.0)
            walk_min = edge.get("estimated_walk_minutes", 1.5)

            graph.add_edge(
                src,
                dst,
                edge_id=edge.get("edge_id"),
                weight=dist_m,
                distance_meters=dist_m,
                estimated_walk_minutes=walk_min,
                surface=edge.get("surface", "paved"),
                is_open=edge.get("is_open", True),
                is_restricted=edge.get("is_restricted", False),
                requires_clearance=edge.get("requires_clearance", False),
                notes=edge.get("notes", ""),
            )

        return graph

    @staticmethod
    def get_graph_summary(graph: nx.Graph) -> Dict[str, Any]:
        """Returns topological metrics of the campus graph."""
        is_connected = nx.is_connected(graph) if len(graph) > 0 else False
        num_components = nx.number_connected_components(graph) if len(graph) > 0 else 0

        return {
            "total_nodes": graph.number_of_nodes(),
            "total_edges": graph.number_of_edges(),
            "is_fully_connected": is_connected,
            "connected_components_count": num_components,
            "density": round(nx.density(graph), 4) if len(graph) > 0 else 0.0,
        }
