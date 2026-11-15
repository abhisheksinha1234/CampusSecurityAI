"""
Constrained Multi-Goal Patrol Route Optimizer.
Formulates campus patrol as a Priority-Reward Orienteering Problem under a finite time budget T_max.
Produces an ordered sequence of patrol stops, detailed node-by-node path expansion, and coverage metrics.
"""

from typing import Dict, Any, List, Set, Tuple, Optional
import networkx as nx
from backend.search.dijkstra_astar import dijkstra_shortest_path
from backend.geospatial.coordinates import calculate_walk_duration_minutes, route_to_geojson_linestring


class PatrolOptimizer:
    """Solves the constrained security patrol sequence optimization problem."""

    @classmethod
    def optimize_patrol(
        cls,
        graph: nx.Graph,
        start_zone_id: str = "Z12",
        end_zone_id: str = "Z12",
        time_budget_minutes: float = 45.0,
        dwell_time_per_stop_minutes: float = 2.0,
        mandatory_zone_ids: Optional[List[str]] = None,
        excluded_zone_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Calculates an optimal patrol route maximizing prioritized risk coverage within the time budget.
        """
        mandatory_zone_ids = set(mandatory_zone_ids or [])
        excluded_zone_ids = set(excluded_zone_ids or [])

        # Check graph validity
        if not graph.has_node(start_zone_id) or not graph.has_node(end_zone_id):
            return {
                "is_feasible": False,
                "error": f"Start ({start_zone_id}) or End ({end_zone_id}) not found in active graph.",
                "stops": [],
                "total_distance_meters": 0.0,
                "total_estimated_duration_minutes": 0.0,
                "priority_coverage_percentage": 0.0,
                "explanations": ["Planning halted: Starting headquarters is disconnected or unavailable."],
            }

        # 1. Precompute all-pairs shortest paths using Dijkstra
        nodes = list(graph.nodes)
        shortest_paths: Dict[Tuple[str, str], List[str]] = {}
        shortest_distances: Dict[Tuple[str, str], float] = {}
        shortest_durations: Dict[Tuple[str, str], float] = {}

        for u in nodes:
            for v in nodes:
                if u == v:
                    shortest_paths[(u, v)] = [u]
                    shortest_distances[(u, v)] = 0.0
                    shortest_durations[(u, v)] = 0.0
                else:
                    res = dijkstra_shortest_path(graph, u, v)
                    if res["success"]:
                        shortest_paths[(u, v)] = res["path"]
                        shortest_distances[(u, v)] = res["total_distance_meters"]
                        shortest_durations[(u, v)] = res["estimated_duration_minutes"]
                    else:
                        shortest_paths[(u, v)] = []
                        shortest_distances[(u, v)] = float("inf")
                        shortest_durations[(u, v)] = float("inf")

        # Verify initial base route feasibility
        base_dist = shortest_distances.get((start_zone_id, end_zone_id), float("inf"))
        base_dur = shortest_durations.get((start_zone_id, end_zone_id), float("inf"))
        if base_dur == float("inf"):
            return {
                "is_feasible": False,
                "error": f"No accessible pedestrian connection between start {start_zone_id} and end {end_zone_id}.",
                "stops": [],
                "total_distance_meters": 0.0,
                "total_estimated_duration_minutes": 0.0,
                "priority_coverage_percentage": 0.0,
                "explanations": ["Operational constraint failed: Campus path is physically disconnected."],
            }

        # 2. Candidate zones sorted by reward = (risk_score * 0.7 + base_priority * 3.0)
        candidates = []
        for n in nodes:
            if n in excluded_zone_ids:
                continue
            if n == start_zone_id and n == end_zone_id:
                continue

            node_data = graph.nodes[n]
            risk = node_data.get("risk_score", 0.0)
            priority = node_data.get("base_priority", 5)
            reward = (risk * 0.7) + (priority * 3.0)
            if n in mandatory_zone_ids:
                reward += 500.0  # Force mandatory consideration

            candidates.append({
                "zone_id": n,
                "name": node_data.get("name", n),
                "reward": reward,
                "risk_score": risk,
                "risk_level": node_data.get("risk_level", "Low"),
                "is_mandatory": n in mandatory_zone_ids,
            })

        # Sort candidates descending by reward
        candidates.sort(key=lambda x: x["reward"], reverse=True)

        # 3. Greedy insertion into patrol tour
        tour = [start_zone_id]
        if start_zone_id != end_zone_id:
            tour.append(end_zone_id)
        else:
            tour.append(start_zone_id)

        visited_set = set(tour)

        def calculate_tour_metrics(current_tour: List[str]) -> Tuple[float, float]:
            total_dist = 0.0
            total_dur = 0.0
            for i in range(len(current_tour) - 1):
                p_from = current_tour[i]
                p_to = current_tour[i + 1]
                total_dist += shortest_distances.get((p_from, p_to), float("inf"))
                total_dur += shortest_durations.get((p_from, p_to), float("inf"))
            # Add inspection dwell time for each intermediate stop
            num_stops = max(0, len(current_tour) - 2)
            total_dur += num_stops * dwell_time_per_stop_minutes
            return total_dist, total_dur

        # Iteratively try to insert high reward candidates at best position
        for cand in candidates:
            c_id = cand["zone_id"]
            if c_id in visited_set:
                continue

            best_position = None
            min_additional_time = float("inf")

            # Try inserting between every adjacent pair in current tour
            for i in range(len(tour) - 1):
                prev_node = tour[i]
                next_node = tour[i + 1]

                time_prev_c = shortest_durations.get((prev_node, c_id), float("inf"))
                time_c_next = shortest_durations.get((c_id, next_node), float("inf"))
                time_prev_next = shortest_durations.get((prev_node, next_node), float("inf"))

                added_travel = (time_prev_c + time_c_next) - time_prev_next
                added_total = added_travel + dwell_time_per_stop_minutes

                if added_total < min_additional_time:
                    min_additional_time = added_total
                    best_position = i + 1

            # Test if inserting candidate fits within time budget
            if best_position is not None:
                trial_tour = tour[:best_position] + [c_id] + tour[best_position:]
                trial_dist, trial_dur = calculate_tour_metrics(trial_tour)

                if trial_dur <= time_budget_minutes:
                    tour = trial_tour
                    visited_set.add(c_id)

        # 4. 2-opt local search optimization to uncross the tour and reduce distance
        tour = cls._two_opt_refine(tour, shortest_distances)

        final_dist, final_dur = calculate_tour_metrics(tour)

        # 5. Build stop records and full path expansion
        stops = []
        cum_dist = 0.0
        cum_time = 0.0
        full_expanded_node_path = []

        for i, z_id in enumerate(tour):
            node_data = graph.nodes[z_id]
            seg_dist = 0.0
            seg_time = 0.0

            if i > 0:
                prev_id = tour[i - 1]
                seg_dist = shortest_distances.get((prev_id, z_id), 0.0)
                seg_time = shortest_durations.get((prev_id, z_id), 0.0) + (dwell_time_per_stop_minutes if i < len(tour) - 1 else 0.0)
                cum_dist += seg_dist
                cum_time += seg_time

                # Expand path between prev_id and z_id
                subpath = shortest_paths.get((prev_id, z_id), [prev_id, z_id])
                # Skip first node to avoid duplicate in continuous line
                for sub_node in subpath[1:]:
                    full_expanded_node_path.append(sub_node)
            else:
                full_expanded_node_path.append(z_id)

            reason = "Security staging base" if i == 0 or i == len(tour) - 1 else (
                f"Selected for high dynamic risk ({node_data.get('risk_score', 0):.0f}) and surveillance coverage."
            )

            stops.append({
                "stop_number": i + 1,
                "zone_id": z_id,
                "zone_name": node_data.get("name", z_id),
                "latitude": node_data.get("latitude", 0.0),
                "longitude": node_data.get("longitude", 0.0),
                "risk_score": node_data.get("risk_score", 0.0),
                "risk_level": node_data.get("risk_level", "Low"),
                "risk_color": node_data.get("risk_color", "#10B981"),
                "cumulative_distance_meters": round(cum_dist, 1),
                "cumulative_time_minutes": round(cum_time, 1),
                "segment_distance_meters": round(seg_dist, 1),
                "segment_time_minutes": round(seg_time, 1),
                "reason_for_visit": reason,
            })

        # Calculate high-risk coverage
        all_high_risk = [
            n for n in nodes
            if graph.nodes[n].get("risk_score", 0) >= 55.0 and n not in excluded_zone_ids
        ]
        visited_high_risk = [n for n in all_high_risk if n in visited_set]
        coverage_pct = (
            round((len(visited_high_risk) / len(all_high_risk)) * 100.0, 1)
            if all_high_risk else 100.0
        )

        unvisited_high_risk = [
            graph.nodes[n].get("name", n)
            for n in all_high_risk if n not in visited_set
        ]

        # Convert full path into GeoJSON LineString
        path_node_objects = [
            {
                "latitude": graph.nodes[nid]["latitude"],
                "longitude": graph.nodes[nid]["longitude"],
                "zone_id": nid
            }
            for nid in full_expanded_node_path if graph.has_node(nid)
        ]
        polyline_geojson = route_to_geojson_linestring(
            path_node_objects,
            properties={
                "total_distance_meters": round(final_dist, 1),
                "total_estimated_duration_minutes": round(final_dur, 1),
                "stop_count": len(stops),
            }
        )

        explanations = [
            f"Plan covers {len(stops)} stops with total walking distance of {final_dist:.0f} meters (~{final_dur:.1f} mins).",
            f"Prioritized high-risk zones coverage achieved: {coverage_pct}%.",
        ]
        if unvisited_high_risk:
            explanations.append(
                f"Note: {', '.join(unvisited_high_risk)} could not be incorporated due to the {time_budget_minutes}-minute patrol budget constraint."
            )

        return {
            "is_feasible": True,
            "start_zone_id": start_zone_id,
            "end_zone_id": end_zone_id,
            "time_budget_minutes": time_budget_minutes,
            "total_distance_meters": round(final_dist, 1),
            "total_estimated_duration_minutes": round(final_dur, 1),
            "priority_coverage_percentage": coverage_pct,
            "total_zones_visited": len(set(tour)),
            "total_campus_zones": len(nodes),
            "stops": stops,
            "tour_sequence": tour,
            "full_expanded_path": full_expanded_node_path,
            "route_polyline_geojson": polyline_geojson,
            "skipped_high_risk_zones": unvisited_high_risk,
            "explanations": explanations,
            "applied_constraints": [
                f"Max patrol duration: {time_budget_minutes} mins",
                "Strict adherence to verified walkable campus pedestrian paths",
                f"Inspection dwell time: {dwell_time_per_stop_minutes} mins/stop"
            ],
        }

    @classmethod
    def _two_opt_refine(cls, tour: List[str], distance_matrix: Dict[Tuple[str, str], float]) -> List[str]:
        """Applies 2-opt swap to reduce tour crossings between intermediate nodes."""
        if len(tour) <= 3:
            return tour

        improved = True
        best_tour = list(tour)

        def tour_distance(t: List[str]) -> float:
            d = 0.0
            for i in range(len(t) - 1):
                d += distance_matrix.get((t[i], t[i + 1]), float("inf"))
            return d

        best_dist = tour_distance(best_tour)

        iterations = 0
        while improved and iterations < 20:
            improved = False
            iterations += 1
            for i in range(1, len(best_tour) - 2):
                for j in range(i + 1, len(best_tour) - 1):
                    # Reverse subsegment [i:j+1]
                    new_tour = best_tour[:i] + best_tour[i:j + 1][::-1] + best_tour[j + 1:]
                    new_dist = tour_distance(new_tour)
                    if new_dist < best_dist - 1.0:  # Noticeable improvement
                        best_tour = new_tour
                        best_dist = new_dist
                        improved = True
                        break
                if improved:
                    break

        return best_tour
