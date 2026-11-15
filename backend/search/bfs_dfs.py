"""
Search Algorithms: Breadth-First Search (BFS) and Depth-First Search (DFS).
Explicit implementations for AI Foundation course evaluation and demonstration.
Provides step-by-step traversal traces and path retrieval.
"""

from collections import deque
from typing import Dict, Any, List, Set, Optional, Tuple
import networkx as nx


def bfs_traverse(
    graph: nx.Graph,
    start_node: str,
    target_node: Optional[str] = None
) -> Dict[str, Any]:
    """
    Breadth-First Search (BFS) on the campus graph.
    Explores neighbors layer by layer (queue-based).
    Finds shortest unweighted hop path.
    """
    if not graph.has_node(start_node):
        return {
            "success": False,
            "error": f"Start node {start_node} not in graph.",
            "visited_order": [],
            "path": None,
            "steps": 0
        }

    visited: Set[str] = set([start_node])
    queue = deque([start_node])
    visited_order: List[str] = []
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    traversal_trace: List[Dict[str, Any]] = []
    step_count = 0

    while queue:
        current = queue.popleft()
        visited_order.append(current)
        step_count += 1

        traversal_trace.append({
            "step": step_count,
            "current_node": current,
            "node_name": graph.nodes[current].get("name", current),
            "queue_state": list(queue),
        })

        if target_node and current == target_node:
            break

        for neighbor in sorted(graph.neighbors(current)):
            if neighbor not in visited:
                visited.add(neighbor)
                parent_map[neighbor] = current
                queue.append(neighbor)

    # Reconstruct path if target specified
    path = None
    if target_node and target_node in visited:
        path = []
        curr = target_node
        while curr is not None:
            path.append(curr)
            curr = parent_map.get(curr)
        path.reverse()

    return {
        "success": True,
        "algorithm": "Breadth-First Search (BFS)",
        "start_node": start_node,
        "target_node": target_node,
        "visited_order": visited_order,
        "total_nodes_visited": len(visited_order),
        "steps": step_count,
        "path": path,
        "path_hop_length": len(path) - 1 if path else None,
        "traversal_trace": traversal_trace,
    }


def dfs_traverse(
    graph: nx.Graph,
    start_node: str,
    target_node: Optional[str] = None
) -> Dict[str, Any]:
    """
    Depth-First Search (DFS) on the campus graph.
    Explores as deep as possible along each branch before backtracking (stack-based).
    """
    if not graph.has_node(start_node):
        return {
            "success": False,
            "error": f"Start node {start_node} not in graph.",
            "visited_order": [],
            "path": None,
            "steps": 0
        }

    visited: Set[str] = set()
    stack = [start_node]
    visited_order: List[str] = []
    parent_map: Dict[str, Optional[str]] = {start_node: None}
    traversal_trace: List[Dict[str, Any]] = []
    step_count = 0

    while stack:
        current = stack.pop()
        if current in visited:
            continue

        visited.add(current)
        visited_order.append(current)
        step_count += 1

        traversal_trace.append({
            "step": step_count,
            "current_node": current,
            "node_name": graph.nodes[current].get("name", current),
            "stack_state": list(stack),
        })

        if target_node and current == target_node:
            break

        # Push neighbors in reverse order so smaller node IDs are popped first
        for neighbor in sorted(graph.neighbors(current), reverse=True):
            if neighbor not in visited:
                if neighbor not in parent_map:
                    parent_map[neighbor] = current
                stack.append(neighbor)

    path = None
    if target_node and target_node in visited:
        path = []
        curr = target_node
        while curr is not None:
            path.append(curr)
            curr = parent_map.get(curr)
        path.reverse()

    return {
        "success": True,
        "algorithm": "Depth-First Search (DFS)",
        "start_node": start_node,
        "target_node": target_node,
        "visited_order": visited_order,
        "total_nodes_visited": len(visited_order),
        "steps": step_count,
        "path": path,
        "path_hop_length": len(path) - 1 if path else None,
        "traversal_trace": traversal_trace,
    }
