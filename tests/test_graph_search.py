"""
Unit tests for Search Algorithms and Graph Builder.
Tests BFS, DFS, Dijkstra, A*, and Patrol Optimizer.
"""

import unittest
from backend.environment.campus_environment import CampusEnvironment
from backend.search.graph_builder import CampusGraphBuilder
from backend.search.bfs_dfs import bfs_traverse, dfs_traverse
from backend.search.dijkstra_astar import dijkstra_shortest_path, astar_shortest_path
from backend.search.patrol_optimizer import PatrolOptimizer


class TestGraphSearchAlgorithms(unittest.TestCase):
    def setUp(self):
        self.env = CampusEnvironment()
        self.zones = self.env.get_all_zones()
        self.edges = self.env.get_all_edges()
        self.graph = CampusGraphBuilder.build_graph(self.zones, self.edges, include_closed_edges=False)

    def test_graph_connectivity(self):
        self.assertGreater(self.graph.number_of_nodes(), 5)
        self.assertGreater(self.graph.number_of_edges(), 5)
        # Check Z01 and Z02 exist and are connected
        self.assertTrue(self.graph.has_node("Z01"))
        self.assertTrue(self.graph.has_node("Z02"))

    def test_bfs_traversal(self):
        res = bfs_traverse(self.graph, start_node="Z01", target_node="Z04")
        self.assertTrue(res["success"])
        self.assertIsNotNone(res["path"])
        self.assertEqual(res["path"][0], "Z01")
        self.assertEqual(res["path"][-1], "Z04")
        self.assertGreaterEqual(res["path_hop_length"], 1)

    def test_dfs_traversal(self):
        res = dfs_traverse(self.graph, start_node="Z01", target_node="Z04")
        self.assertTrue(res["success"])
        self.assertIsNotNone(res["path"])
        self.assertEqual(res["path"][0], "Z01")
        self.assertEqual(res["path"][-1], "Z04")

    def test_dijkstra_vs_astar_optimality(self):
        # Both Dijkstra and admissible A* must find identical shortest path costs
        dijkstra_res = dijkstra_shortest_path(self.graph, "Z01", "Z08")
        astar_res = astar_shortest_path(self.graph, "Z01", "Z08")

        self.assertTrue(dijkstra_res["success"])
        self.assertTrue(astar_res["success"])
        self.assertAlmostEqual(
            dijkstra_res["total_distance_meters"],
            astar_res["total_distance_meters"],
            delta=0.5
        )
        # A* should expand fewer or equal nodes than uninformed Dijkstra
        self.assertLessEqual(astar_res["nodes_expanded"], dijkstra_res["nodes_expanded"])

    def test_patrol_optimizer_budget_constraint(self):
        # Test that patrol duration does not exceed budget
        budget = 40.0
        plan = PatrolOptimizer.optimize_patrol(
            self.graph,
            start_zone_id="Z12",
            end_zone_id="Z12",
            time_budget_minutes=budget,
            dwell_time_per_stop_minutes=2.0
        )
        self.assertTrue(plan["is_feasible"])
        self.assertLessEqual(plan["total_estimated_duration_minutes"], budget + 0.1)
        self.assertGreaterEqual(len(plan["stops"]), 3)
        self.assertEqual(plan["stops"][0]["zone_id"], "Z12")
        self.assertEqual(plan["stops"][-1]["zone_id"], "Z12")


if __name__ == "__main__":
    unittest.main()
