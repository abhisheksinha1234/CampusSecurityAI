"""
Evaluation and Algorithm Demonstration API Endpoints.
Provides baseline comparative benchmarking and academic demonstrations
for BFS, DFS, Dijkstra, and A* algorithms.
Protected by Authentication Middleware.
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional

from backend.environment.campus_environment import campus_env
from backend.api.routes_patrol import patrol_agent
from backend.evaluation.baseline_comparator import BaselineComparator
from backend.search.graph_builder import CampusGraphBuilder
from backend.search.bfs_dfs import bfs_traverse, dfs_traverse
from backend.search.dijkstra_astar import dijkstra_shortest_path, astar_shortest_path
from backend.api.auth_middleware import get_current_user

router = APIRouter(prefix="/api/evaluation", tags=["Evaluation & Algorithms"])


@router.get("/compare")
def compare_with_baseline(
    scenario_name: str = Query("Live Campus Assessment"),
    user: dict = Depends(get_current_user),
):
    """
    Benchmarks the Adaptive AI Agent against the Fixed-Schedule Baseline
    under the current campus conditions. Requires authentication.
    """
    res = BaselineComparator.evaluate_scenario(campus_env, patrol_agent, scenario_name)
    return res


@router.get("/algorithms/demo")
def demonstrate_algorithms(
    start_zone_id: str = Query("Z01", description="Source zone ID"),
    target_zone_id: str = Query("Z08", description="Target zone ID"),
    user: dict = Depends(get_current_user),
):
    """
    Academic algorithm runner: executes BFS, DFS, Dijkstra, and A*
    on the campus graph. Requires authentication.
    """
    zones = campus_env.get_all_zones()
    edges = campus_env.get_all_edges()
    graph = CampusGraphBuilder.build_graph(zones, edges, include_closed_edges=False)

    if not graph.has_node(start_zone_id) or not graph.has_node(target_zone_id):
        raise HTTPException(
            status_code=400,
            detail=f"Start ({start_zone_id}) or Target ({target_zone_id}) not found in active graph."
        )

    bfs_res = bfs_traverse(graph, start_zone_id, target_zone_id)
    dfs_res = dfs_traverse(graph, start_zone_id, target_zone_id)
    dijkstra_res = dijkstra_shortest_path(graph, start_zone_id, target_zone_id)
    astar_res = astar_shortest_path(graph, start_zone_id, target_zone_id)

    return {
        "start_zone": start_zone_id,
        "target_zone": target_zone_id,
        "results": {
            "bfs": bfs_res,
            "dfs": dfs_res,
            "dijkstra": dijkstra_res,
            "astar": astar_res,
        },
        "academic_analysis": {
            "unweighted_vs_weighted": "BFS guarantees minimum edge-hop count, while Dijkstra and A* guarantee minimum physical ground distance.",
            "informed_vs_uninformed": f"A* expanded {astar_res['nodes_expanded']} nodes versus Dijkstra's {dijkstra_res['nodes_expanded']} nodes due to the Haversine heuristic guidance.",
        }
    }
