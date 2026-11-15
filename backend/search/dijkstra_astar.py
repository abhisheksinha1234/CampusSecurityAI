"""
Shortest Path Search Algorithms: Dijkstra's Algorithm and A* Search.
Explicitly implemented with min-heap priority queues and Haversine heuristic.
Provides step counts, distance (meters), estimated foot patrol time (mins), and path traces.
"""

import heapq
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx
from backend.geospatial.coordinates import haversine_distance, calculate_walk_duration_minutes


def dijkstra_shortest_path(
    graph: nx.Graph,
    start_node: str,
    target_node: str,
    weight_attribute: str = "distance_meters"
) -> Dict[str, Any]:
    """
    Dijkstra's Algorithm for finding the optimal shortest path between two campus zones.
    Uses edge weight_attribute (defaults to physical distance in meters).
    """
    if not graph.has_node(start_node) or not graph.has_node(target_node):
        return {
            "success": False,
            "error": "Start or target node does not exist in graph.",
            "path": None,
            "cost": float("inf"),
        }

    # Priority queue holds tuples of (current_cost, node)
    pq: List[Tuple[float, str]] = [(0.0, start_node)]
    distances: Dict[str, float] = {node: float("inf") for node in graph.nodes}
    distances[start_node] = 0.0
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    visited_nodes: List[str] = []
    step_count = 0

    while pq:
        curr_dist, curr_node = heapq.heappop(pq)
        step_count += 1
        visited_nodes.append(curr_node)

        if curr_node == target_node:
            break

        if curr_dist > distances[curr_node]:
            continue

        for neighbor in graph.neighbors(curr_node):
            edge_data = graph.get_edge_data(curr_node, neighbor)
            weight = edge_data.get(weight_attribute, 100.0)
            new_dist = curr_dist + weight

            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                parent_map[neighbor] = curr_node
                heapq.heappush(pq, (new_dist, neighbor))

    if distances[target_node] == float("inf"):
        return {
            "success": False,
            "algorithm": "Dijkstra's Algorithm",
            "error": f"No path found between {start_node} and {target_node}.",
            "path": None,
            "cost": float("inf"),
            "steps": step_count,
        }

    # Reconstruct path
    path = []
    curr = target_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()

    total_dist = distances[target_node]
    est_time = calculate_walk_duration_minutes(total_dist)

    return {
        "success": True,
        "algorithm": "Dijkstra's Algorithm",
        "start_node": start_node,
        "target_node": target_node,
        "path": path,
        "total_distance_meters": round(total_dist, 2),
        "estimated_duration_minutes": est_time,
        "steps": step_count,
        "nodes_expanded": len(visited_nodes),
    }


def astar_shortest_path(
    graph: nx.Graph,
    start_node: str,
    target_node: str,
    weight_attribute: str = "distance_meters"
) -> Dict[str, Any]:
    """
    A* Search Algorithm with Admissible Haversine Distance Heuristic.
    f(n) = g(n) + h(n)
    g(n) = exact path distance from start to n
    h(n) = great-circle straight-line distance from n to target (admissible lower bound)
    """
    if not graph.has_node(start_node) or not graph.has_node(target_node):
        return {
            "success": False,
            "error": "Start or target node does not exist in graph.",
            "path": None,
            "cost": float("inf"),
        }

    target_data = graph.nodes[target_node]
    t_lat, t_lon = target_data.get("latitude", 0.0), target_data.get("longitude", 0.0)

    def heuristic(node: str) -> float:
        node_data = graph.nodes[node]
        n_lat, n_lon = node_data.get("latitude", 0.0), node_data.get("longitude", 0.0)
        return haversine_distance(n_lat, n_lon, t_lat, t_lon)

    # Priority queue holds (f_score, g_score, node)
    initial_h = heuristic(start_node)
    pq: List[Tuple[float, float, str]] = [(initial_h, 0.0, start_node)]
    g_scores: Dict[str, float] = {node: float("inf") for node in graph.nodes}
    g_scores[start_node] = 0.0
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    visited_nodes: List[str] = []
    step_count = 0

    while pq:
        f_curr, g_curr, curr_node = heapq.heappop(pq)
        step_count += 1
        visited_nodes.append(curr_node)

        if curr_node == target_node:
            break

        if g_curr > g_scores[curr_node]:
            continue

        for neighbor in graph.neighbors(curr_node):
            edge_data = graph.get_edge_data(curr_node, neighbor)
            weight = edge_data.get(weight_attribute, 100.0)
            tentative_g = g_curr + weight

            if tentative_g < g_scores[neighbor]:
                g_scores[neighbor] = tentative_g
                parent_map[neighbor] = curr_node
                h_val = heuristic(neighbor)
                f_score = tentative_g + h_val
                heapq.heappush(pq, (f_score, tentative_g, neighbor))

    if g_scores[target_node] == float("inf"):
        return {
            "success": False,
            "algorithm": "A* Search (Haversine Heuristic)",
            "error": f"No path found between {start_node} and {target_node}.",
            "path": None,
            "cost": float("inf"),
            "steps": step_count,
        }

    # Reconstruct path
    path = []
    curr = target_node
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
    path.reverse()

    total_dist = g_scores[target_node]
    est_time = calculate_walk_duration_minutes(total_dist)

    return {
        "success": True,
        "algorithm": "A* Search (Haversine Heuristic)",
        "start_node": start_node,
        "target_node": target_node,
        "path": path,
        "total_distance_meters": round(total_dist, 2),
        "estimated_duration_minutes": est_time,
        "steps": step_count,
        "nodes_expanded": len(visited_nodes),
    }
